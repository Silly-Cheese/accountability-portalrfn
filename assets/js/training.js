import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";
let currentModule = null;
let currentIndex = 0;
let sections = [];
let questions = [];
let answers = {};

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function requireAuth() {
  if (!getSession()) window.location.href = "index.html";
}

async function loadModules() {
  const list = document.getElementById("trainingList");
  const snap = await getDocs(collection(db, "trainingModules"));

  if (snap.empty) {
    list.innerHTML = '<div class="empty-state">No training modules available.</div>';
    return;
  }

  list.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${data.title}</strong><p>${data.description || ""}</p><button class="primary-btn compact">Start</button>`;
    div.querySelector("button").onclick = () => openModule(docSnap.id, data);
    list.appendChild(div);
  });
}

async function openModule(moduleId, data) {
  currentModule = moduleId;
  currentIndex = 0;

  const secSnap = await getDocs(collection(db, "trainingSections"));
  const qSnap = await getDocs(collection(db, "trainingQuestions"));

  sections = secSnap.docs.map(d => d.data()).filter(s => s.moduleId === moduleId).sort((a,b)=>a.order-b.order);
  questions = qSnap.docs.map(d => d.data()).filter(q => q.moduleId === moduleId);

  document.getElementById("moduleTitle").textContent = data.title;
  document.getElementById("modulePlayer").classList.remove("hidden");

  renderSection();
}

function renderSection() {
  const content = document.getElementById("moduleContent");
  const quizBox = document.getElementById("quizBox");

  const section = sections[currentIndex];
  if (!section) return;

  content.innerHTML = `<h3>${section.title}</h3><p>${section.content}</p>`;

  const sectionQuestions = questions.filter(q => q.sectionId === section.sectionId);
  quizBox.innerHTML = "";

  sectionQuestions.forEach(q => {
    const div = document.createElement("div");
    div.innerHTML = `<p>${q.question}</p>` + q.options.map(opt => `<label><input type="radio" name="${q.question}" value="${opt}">${opt}</label>`).join("");
    quizBox.appendChild(div);
  });
}

function nextSection() {
  currentIndex++;
  if (currentIndex >= sections.length) {
    document.getElementById("submitQuizBtn").classList.remove("hidden");
    return;
  }
  renderSection();
}

function prevSection() {
  if (currentIndex > 0) currentIndex--;
  renderSection();
}

async function submitQuiz() {
  const session = getSession();
  await setDoc(doc(db, "trainingCompletions", `${session.employeeId}_${currentModule}`), {
    userId: session.employeeId,
    moduleId: currentModule,
    completedAt: new Date()
  });

  document.getElementById("trainingMessage").textContent = "Training Completed.";
}

async function seedTraining() {
  await setDoc(doc(db, "trainingModules", "starter"), {
    title: "RFN Accountability Basics",
    description: "Intro training module"
  });

  await setDoc(doc(db, "trainingSections", "s1"), {
    moduleId: "starter",
    sectionId: "s1",
    order: 1,
    title: "Accountability",
    content: "You must follow RFN standards."
  });

  await setDoc(doc(db, "trainingQuestions", "q1"), {
    moduleId: "starter",
    sectionId: "s1",
    question: "What happens if you fail reviews?",
    options: ["Nothing","Strike","Promotion"],
    correctAnswer: "Strike"
  });

  alert("Starter module created");
  loadModules();
}

document.getElementById("nextSectionBtn").onclick = nextSection;
document.getElementById("prevSectionBtn").onclick = prevSection;
document.getElementById("submitQuizBtn").onclick = submitQuiz;
document.getElementById("seedTrainingBtn").onclick = seedTraining;

document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
};

requireAuth();
loadModules();
