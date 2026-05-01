import { db } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { requireAuth, applyRoleBasedNavigation, logout } from "./permissions.js";

const welcomeTitle = document.getElementById("welcomeTitle");
const roleLine = document.getElementById("roleLine");
const strikeCount = document.getElementById("strikeCount");
const logoutBtn = document.getElementById("logoutBtn");

async function loadUserData(session) {
  const userRef = doc(db, "users", session.employeeId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    localStorage.removeItem("rfn_accountability_session");
    window.location.href = "index.html";
    return;
  }

  const user = snap.data();

  welcomeTitle.textContent = `Welcome, ${user.username || session.employeeId}`;
  roleLine.textContent = `${user.role || "Staff"} | Employee ID: ${session.employeeId}`;
  strikeCount.textContent = user.strikes || 0;

  applyRoleBasedNavigation(session);
}

async function loadAnnouncements() {
  const container = document.getElementById("announcementList");
  const snap = await getDocs(collection(db, "announcements"));

  container.innerHTML = snap.empty
    ? '<div class="empty-state">No announcements posted.</div>'
    : "";

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${data.title}</strong><p>${data.body}</p>`;
    container.appendChild(div);
  });
}

async function init() {
  const session = requireAuth();
  if (!session) return;

  await loadUserData(session);
  await loadAnnouncements();
}

logoutBtn?.addEventListener("click", logout);
init();
