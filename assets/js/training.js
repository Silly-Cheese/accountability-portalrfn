import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { requireAuth, logout } from "./permissions.js";

let draftSections = [];
let activeModuleId = null;
let playerSections = [];
let playerQuestions = [];
let currentIndex = 0;

function value(id){ return document.getElementById(id)?.value?.trim() || ""; }
function message(text){ document.getElementById("builderMessage").textContent = text; }

async function loadModules(){
  const list = document.getElementById("trainingList");
  const snap = await getDocs(collection(db,"trainingModules"));
  list.innerHTML = snap.empty ? '<div class="empty-state">No training modules published yet.</div>' : "";
  snap.forEach(d=>{
    const data = d.data();
    const div = document.createElement("div");
    div.className = "list-item training-item";
    div.innerHTML = `<div><strong>${data.title || d.id}</strong><p>${data.description || "No description provided."}</p><small>Roles: ${(data.roles || ["All"]).join(", ")} | Passing: ${data.passingScore || 80}%</small></div><div class="action-row"><button class="primary-btn compact" data-start="${d.id}">Start</button><button class="secondary-btn" data-edit="${d.id}">Edit</button><button class="secondary-btn danger-text" data-delete="${d.id}">Delete</button></div>`;
    list.appendChild(div);
  });
  document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>openModule(b.dataset.start));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>loadIntoBuilder(b.dataset.edit));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteModule(b.dataset.delete));
}

function renderDraft(){
  const box = document.getElementById("builderSections");
  if(!draftSections.length){ box.innerHTML = '<div class="empty-state">No draft sections yet. Click + Add Section.</div>'; return; }
  box.innerHTML = "";
  draftSections.forEach((s,i)=>{
    const el = document.createElement("div");
    el.className = "builder-section-card";
    el.innerHTML = `<div class="builder-section-head"><span>Section ${i+1}</span><div><button class="secondary-btn tiny" data-up="${i}">↑</button><button class="secondary-btn tiny" data-down="${i}">↓</button><button class="secondary-btn tiny danger-text" data-remove="${i}">Remove</button></div></div><div class="form-group"><label>Section Title</label><input data-field="title" data-index="${i}" value="${s.title}"></div><div class="form-group"><label>Reading Content</label><textarea data-field="content" data-index="${i}" rows="5">${s.content}</textarea></div><div class="form-group"><label>Quiz Question</label><input data-field="question" data-index="${i}" value="${s.question}"></div><div class="form-group"><label>Answer Options</label><input data-field="options" data-index="${i}" value="${s.options.join(", ")}"></div><div class="form-group"><label>Correct Answer</label><input data-field="correctAnswer" data-index="${i}" value="${s.correctAnswer}"></div>`;
    box.appendChild(el);
  });
  document.querySelectorAll("[data-field]").forEach(input=>input.oninput=()=>{
    const i = Number(input.dataset.index);
    draftSections[i][input.dataset.field] = input.dataset.field === "options" ? input.value.split(",").map(x=>x.trim()).filter(Boolean) : input.value;
  });
  document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{draftSections.splice(Number(b.dataset.remove),1);renderDraft();});
  document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>moveSection(Number(b.dataset.up),-1));
  document.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>moveSection(Number(b.dataset.down),1));
}

function moveSection(i,dir){ const n=i+dir; if(n<0||n>=draftSections.length)return; [draftSections[i],draftSections[n]]=[draftSections[n],draftSections[i]]; renderDraft(); }
function addSection(){ draftSections.push({title:"",content:"",question:"",options:["Yes","No"],correctAnswer:""}); renderDraft(); }

async function publishModule(){
  const moduleId = value("builderModuleId");
  if(!moduleId || !value("builderTitle")){ message("Module ID and title are required."); return; }
  await setDoc(doc(db,"trainingModules",moduleId),{ title:value("builderTitle"), description:value("builderDescription"), roles:value("builderRoles").split(",").map(x=>x.trim()).filter(Boolean), passingScore:Number(value("builderPassing")||80), updatedAt:new Date() });
  for(let i=0;i<draftSections.length;i++){
    const secId = `${moduleId}_sec_${i+1}`;
    await setDoc(doc(db,"trainingSections",secId),{ moduleId, sectionId:secId, order:i+1, title:draftSections[i].title, content:draftSections[i].content });
    await setDoc(doc(db,"trainingQuestions",`${secId}_q1`),{ moduleId, sectionId:secId, question:draftSections[i].question, options:draftSections[i].options, correctAnswer:draftSections[i].correctAnswer });
  }
  message("Module published successfully.");
  await loadModules();
}

async function loadIntoBuilder(moduleId){
  activeModuleId = moduleId;
  const modules = await getDocs(collection(db,"trainingModules"));
  modules.forEach(d=>{ if(d.id===moduleId){ const m=d.data(); document.getElementById("builderModuleId").value=moduleId; document.getElementById("builderTitle").value=m.title||""; document.getElementById("builderDescription").value=m.description||""; document.getElementById("builderRoles").value=(m.roles||[]).join(", "); document.getElementById("builderPassing").value=m.passingScore||80; }});
  const secSnap = await getDocs(collection(db,"trainingSections"));
  const qSnap = await getDocs(collection(db,"trainingQuestions"));
  const qs = qSnap.docs.map(d=>d.data());
  draftSections = secSnap.docs.map(d=>d.data()).filter(s=>s.moduleId===moduleId).sort((a,b)=>(a.order||0)-(b.order||0)).map(s=>{ const q=qs.find(x=>x.sectionId===s.sectionId)||{}; return {title:s.title||"",content:s.content||"",question:q.question||"",options:q.options||["Yes","No"],correctAnswer:q.correctAnswer||""}; });
  renderDraft();
  message("Module loaded for editing.");
}

async function deleteModule(moduleId){
  await deleteDoc(doc(db,"trainingModules",moduleId));
  message("Module deleted. Related sections remain archived in Firestore unless manually removed.");
  await loadModules();
}

async function openModule(moduleId){
  activeModuleId = moduleId; currentIndex = 0;
  const secSnap = await getDocs(collection(db,"trainingSections"));
  const qSnap = await getDocs(collection(db,"trainingQuestions"));
  playerSections = secSnap.docs.map(d=>d.data()).filter(s=>s.moduleId===moduleId).sort((a,b)=>(a.order||0)-(b.order||0));
  playerQuestions = qSnap.docs.map(d=>d.data()).filter(q=>q.moduleId===moduleId);
  document.getElementById("modulePlayer").classList.remove("hidden");
  renderPlayer();
}

function renderPlayer(){
  const s = playerSections[currentIndex]; if(!s)return;
  document.getElementById("moduleTitle").textContent = s.title;
  document.getElementById("moduleContent").innerHTML = `<h3>${s.title}</h3><p>${s.content}</p>`;
  const qs = playerQuestions.filter(q=>q.sectionId===s.sectionId);
  document.getElementById("quizBox").innerHTML = qs.map(q=>`<div class="quiz-question"><strong>${q.question}</strong>${(q.options||[]).map(o=>`<label><input type="radio" name="${q.sectionId}" value="${o}"> ${o}</label>`).join("")}</div>`).join("");
  document.getElementById("moduleProgress").style.width = `${((currentIndex+1)/playerSections.length)*100}%`;
}

function next(){ if(currentIndex < playerSections.length-1){ currentIndex++; renderPlayer(); } else document.getElementById("submitQuizBtn").classList.remove("hidden"); }
function prev(){ if(currentIndex>0){ currentIndex--; renderPlayer(); } }
async function complete(){ const s=requireAuth(); await setDoc(doc(db,"trainingCompletions",`${s.employeeId}_${activeModuleId}`),{userId:s.employeeId,moduleId:activeModuleId,completedAt:new Date()}); document.getElementById("trainingMessage").textContent="Training completed and recorded."; }

requireAuth();
document.getElementById("addSectionBtn")?.addEventListener("click",addSection);
document.getElementById("publishModuleBtn")?.addEventListener("click",publishModule);
document.getElementById("previewBuilderBtn")?.addEventListener("click",()=>{message(`Draft has ${draftSections.length} section(s).`)});
document.getElementById("nextSectionBtn")?.addEventListener("click",next);
document.getElementById("prevSectionBtn")?.addEventListener("click",prev);
document.getElementById("submitQuizBtn")?.addEventListener("click",complete);
document.getElementById("logoutBtn")?.addEventListener("click",logout);
loadModules(); renderDraft();
