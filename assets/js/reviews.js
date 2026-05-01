import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";
let currentTemplate = null;

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function requireAuth() {
  if (!getSession()) window.location.href = "index.html";
}

async function loadTemplates() {
  const list = document.getElementById("reviewTemplateList");
  const snap = await getDocs(collection(db, "reviewTemplates"));

  if (snap.empty) {
    list.innerHTML = '<div class="empty-state">No review templates available.</div>';
    return;
  }

  list.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${data.title}</strong><p>${data.description || ""}</p><button class="primary-btn compact">Open</button>`;
    div.querySelector("button").onclick = () => openTemplate(docSnap.id, data);
    list.appendChild(div);
  });
}

function openTemplate(id, data) {
  currentTemplate = { id, ...data };
  document.getElementById("reviewFormPanel").classList.remove("hidden");
  document.getElementById("reviewFormTitle").textContent = data.title;
  document.getElementById("reviewFormDescription").textContent = data.description || "";

  const container = document.getElementById("dynamicReviewQuestions");
  container.innerHTML = "";

  (data.questions || []).forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<label>${q.prompt}</label><input data-q="${index}" required />`;
    container.appendChild(div);
  });
}

async function submitReview(e) {
  e.preventDefault();
  const session = getSession();

  const answers = {};
  document.querySelectorAll("[data-q]").forEach(input => {
    answers[input.dataset.q] = input.value;
  });

  const targetUserId = document.getElementById("targetUserId").value;

  await setDoc(doc(db, "reviewResponses", `${Date.now()}_${session.employeeId}`), {
    reviewerId: session.employeeId,
    targetUserId,
    templateId: currentTemplate.id,
    answers,
    submittedAt: new Date()
  });

  document.getElementById("reviewMessage").textContent = "Review submitted successfully.";
}

async function loadHistory() {
  const container = document.getElementById("reviewHistory");
  const snap = await getDocs(collection(db, "reviewResponses"));

  if (snap.empty) {
    container.innerHTML = '<div class="empty-state">No reviews submitted.</div>';
    return;
  }

  container.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${data.templateId}</strong><p>Target: ${data.targetUserId}</p>`;
    container.appendChild(div);
  });
}

async function seedReview() {
  await setDoc(doc(db, "reviewTemplates", "starter"), {
    title: "Monthly Staff Review",
    description: "Basic performance review",
    questions: [
      { prompt: "What did this staff member do well?" },
      { prompt: "What should they improve?" }
    ]
  });

  alert("Starter review created");
  loadTemplates();
}


document.getElementById("performanceReviewForm").addEventListener("submit", submitReview);
document.getElementById("seedReviewBtn").onclick = seedReview;
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
};

requireAuth();
loadTemplates();
loadHistory();
