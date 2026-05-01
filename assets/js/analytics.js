import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { requireRole, logout } from "./permissions.js";

async function loadAnalytics() {
  const users = await getDocs(collection(db, "users"));
  const training = await getDocs(collection(db, "trainingCompletions"));
  const reviews = await getDocs(collection(db, "reviewResponses"));
  const strikes = await getDocs(collection(db, "strikes"));

  document.getElementById("totalStaff").textContent = users.size;
  document.getElementById("trainingComplete").textContent = training.size;
  document.getElementById("reviewsCount").textContent = reviews.size;
  document.getElementById("strikeTotal").textContent = strikes.size;
}

requireRole("management");
loadAnalytics();

document.getElementById("logoutBtn").onclick = logout;