import { db } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";

const welcomeTitle = document.getElementById("welcomeTitle");
const roleLine = document.getElementById("roleLine");
const strikeCount = document.getElementById("strikeCount");
const logoutBtn = document.getElementById("logoutBtn");
const adminLink = document.querySelector("[data-admin-link]");

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

async function loadUserData(session) {
  const userRef = doc(db, "users", session.employeeId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
    return;
  }

  const user = snap.data();

  welcomeTitle.textContent = `Welcome, ${user.username || session.employeeId}`;
  roleLine.textContent = `${user.role || "Staff"} | Employee ID: ${session.employeeId}`;
  strikeCount.textContent = user.strikes || 0;

  if ((user.role || "").toLowerCase() !== "ceo") {
    adminLink?.classList.add("hidden");
  }
}

async function loadAnnouncements() {
  const container = document.getElementById("announcementList");
  try {
    const snap = await getDocs(collection(db, "announcements"));
    if (snap.empty) {
      container.innerHTML = '<div class="empty-state">No announcements posted.</div>';
      return;
    }

    container.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `<strong>${data.title || "Announcement"}</strong><p>${data.body || ""}</p>`;
      container.appendChild(div);
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state">Failed to load announcements.</div>';
  }
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

async function init() {
  const session = requireAuth();
  if (!session) return;

  await loadUserData(session);
  await loadAnnouncements();
}

logoutBtn?.addEventListener("click", handleLogout);
init();
