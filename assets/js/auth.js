import { db, ensureCoreCollections } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";
const LOCKOUT_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 3;

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");
const suspensionModal = document.getElementById("suspensionModal");
const closeSuspensionModal = document.getElementById("closeSuspensionModal");

function setMessage(message, type = "error") {
  if (!loginMessage) return;
  loginMessage.textContent = message;
  loginMessage.className = `form-message ${type}`;
}

function normalizeEmployeeId(value) {
  return String(value || "").trim().toUpperCase();
}

function nowMs() {
  return Date.now();
}

function isLocked(user) {
  if (!user.lockedUntil) return false;
  const lockedUntil = typeof user.lockedUntil === "number" ? user.lockedUntil : 0;
  return lockedUntil > nowMs();
}

function showSuspensionModal(user) {
  document.getElementById("suspensionReason").textContent = user.suspensionReason || "No reason was provided.";
  document.getElementById("suspensionBy").textContent = user.suspensionIssuedBy || "RFN Administration";
  document.getElementById("suspensionDate").textContent = user.suspensionIssuedAt || "Unknown";
  suspensionModal?.classList.remove("hidden");
}

async function logAudit(action, actorId, details = {}) {
  const auditId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await setDoc(doc(db, "auditLogs", auditId), {
    action,
    actorId,
    details,
    createdAt: serverTimestamp()
  });
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage("");
  loginButton.disabled = true;
  loginButton.textContent = "Signing In...";

  try {
    await ensureCoreCollections();

    const employeeId = normalizeEmployeeId(document.getElementById("employeeId").value);
    const password = document.getElementById("password").value;
    const userRef = doc(db, "users", employeeId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setMessage("No staff account was found for that Employee ID.");
      return;
    }

    const user = userSnap.data();

    if (isLocked(user)) {
      setMessage("This account is temporarily locked because of failed sign-in attempts. Try again later.");
      return;
    }

    if (user.suspended === true || user.active === false) {
      await logAudit("blocked_suspended_login", employeeId, { reason: user.suspensionReason || "Unknown" });
      showSuspensionModal(user);
      return;
    }

    if (user.password !== password) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: failedAttempts, lastFailedLogin: serverTimestamp() };
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        update.lockedUntil = nowMs() + LOCKOUT_MINUTES * 60 * 1000;
      }
      await updateDoc(userRef, update);
      await logAudit("failed_login", employeeId, { failedAttempts });
      setMessage(failedAttempts >= MAX_FAILED_ATTEMPTS ? "Too many failed attempts. Account locked for 5 minutes." : "Incorrect password.");
      return;
    }

    await updateDoc(userRef, {
      failedLoginAttempts: 0,
      lockedUntil: 0,
      lastLogin: serverTimestamp()
    });

    const session = {
      employeeId,
      username: user.username || employeeId,
      role: user.role || "Staff",
      loginAt: nowMs(),
      mustResetPassword: user.mustResetPassword === true
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    await logAudit("successful_login", employeeId, { role: session.role });
    window.location.href = session.mustResetPassword ? "profile.html?reset=1" : "dashboard.html";
  } catch (error) {
    console.error(error);
    setMessage("The portal could not sign you in. Check Firebase rules and try again.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
}

closeSuspensionModal?.addEventListener("click", () => suspensionModal?.classList.add("hidden"));
loginForm?.addEventListener("submit", handleLogin);
