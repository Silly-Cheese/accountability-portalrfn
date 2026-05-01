import { db } from "./firebase.js";
import { doc, setDoc, updateDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function requireCEO() {
  const session = getSession();
  if (!session || session.role.toLowerCase() !== "ceo") {
    window.location.href = "dashboard.html";
  }
}

async function createUser(e) {
  e.preventDefault();
  const id = document.getElementById("newEmployeeId").value.toUpperCase();

  await setDoc(doc(db, "users", id), {
    employeeId: id,
    username: document.getElementById("newUsername").value,
    role: document.getElementById("newRole").value,
    password: document.getElementById("newPassword").value,
    mustResetPassword: true,
    strikes: 0,
    active: true,
    suspended: false
  });

  document.getElementById("createUserMsg").textContent = "Account created.";
  loadStaff();
}

async function issueStrike(e) {
  e.preventDefault();
  const id = document.getElementById("strikeEmployeeId").value.toUpperCase();
  const reason = document.getElementById("strikeReason").value;

  await setDoc(doc(db, "strikes", `${Date.now()}_${id}`), {
    userId: id,
    reason,
    issuedBy: getSession().employeeId
  });

  const userRef = doc(db, "users", id);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const strikes = (snap.data().strikes || 0) + 1;
    await updateDoc(userRef, { strikes });
  }

  document.getElementById("strikeMsg").textContent = "Strike issued.";
}

async function suspendUser(e) {
  e.preventDefault();
  const id = document.getElementById("suspendEmployeeId").value.toUpperCase();

  await updateDoc(doc(db, "users", id), {
    suspended: true,
    active: false,
    suspensionReason: document.getElementById("suspendReason").value
  });

  document.getElementById("suspendMsg").textContent = "Account suspended.";
}

async function reactivateUser(e) {
  e.preventDefault();
  const id = document.getElementById("reactivateEmployeeId").value.toUpperCase();

  await updateDoc(doc(db, "users", id), {
    suspended: false,
    active: true
  });

  document.getElementById("reactivateMsg").textContent = "Account reactivated.";
}

async function loadStaff() {
  const container = document.getElementById("staffList");
  const snap = await getDocs(collection(db, "users"));

  container.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${data.employeeId}</strong><p>${data.role} | Strikes: ${data.strikes || 0}</p>`;
    container.appendChild(div);
  });
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}


document.getElementById("createUserForm").addEventListener("submit", createUser);
document.getElementById("strikeForm").addEventListener("submit", issueStrike);
document.getElementById("suspendForm").addEventListener("submit", suspendUser);
document.getElementById("reactivateForm").addEventListener("submit", reactivateUser);
document.getElementById("logoutBtn").onclick = logout;

requireCEO();
loadStaff();
