import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function requireAuth() {
  if (!getSession()) window.location.href = "index.html";
}

async function loadProfile() {
  const session = getSession();
  const userRef = doc(db, "users", session.employeeId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
    return;
  }

  const user = snap.data();

  document.getElementById("profileName").textContent = user.username || session.employeeId;
  document.getElementById("profileMeta").textContent = `${session.employeeId}`;
  document.getElementById("profileRole").textContent = user.role || "Staff";
  document.getElementById("profileStrikes").textContent = user.strikes || 0;

  document.getElementById("accountStatus").textContent = user.suspended ? "Suspended" : "Active";
}

async function loadStrikes() {
  const container = document.getElementById("strikeHistory");
  const session = getSession();
  const snap = await getDocs(collection(db, "strikes"));

  container.innerHTML = "";

  const relevant = snap.docs.map(d => d.data()).filter(s => s.userId === session.employeeId);

  if (relevant.length === 0) {
    container.innerHTML = '<div class="empty-state">No strikes on record.</div>';
    return;
  }

  relevant.forEach(s => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${s.reason}</strong><p>Issued By: ${s.issuedBy}</p>`;
    container.appendChild(div);
  });
}

async function loadActions() {
  const container = document.getElementById("actionHistory");
  const session = getSession();
  const snap = await getDocs(collection(db, "accountActions"));

  container.innerHTML = "";

  const relevant = snap.docs.map(d => d.data()).filter(a => a.employeeId === session.employeeId);

  if (relevant.length === 0) {
    container.innerHTML = '<div class="empty-state">No account actions recorded.</div>';
    return;
  }

  relevant.forEach(a => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${a.actionType}</strong><p>${a.reason}</p>`;
    container.appendChild(div);
  });
}

async function updatePassword(e) {
  e.preventDefault();
  const session = getSession();
  const newPassword = document.getElementById("newPassword").value;

  await updateDoc(doc(db, "users", session.employeeId), {
    password: newPassword,
    mustResetPassword: false
  });

  document.getElementById("passwordMessage").textContent = "Password updated.";
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}


document.getElementById("passwordResetForm").addEventListener("submit", updatePassword);
document.getElementById("logoutBtn").onclick = logout;

requireAuth();
loadProfile();
loadStrikes();
loadActions();
