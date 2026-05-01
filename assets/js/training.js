import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const SESSION_KEY = "rfn_accountability_session";

function getSession(){return JSON.parse(localStorage.getItem(SESSION_KEY));}
function requireAuth(){if(!getSession()) window.location.href="index.html";}

async function loadModules(){
 const list=document.getElementById("trainingList");
 const snap=await getDocs(collection(db,"trainingModules"));
 list.innerHTML=snap.empty?'<div class="empty-state">No training modules.</div>':'';
 snap.forEach(d=>{
  const data=d.data();
  const div=document.createElement("div");
  div.className="list-item";
  div.innerHTML=`<strong>${data.title}</strong><p>${data.description||""}</p>`;
  list.appendChild(div);
 });
}

async function saveTraining(e){
 e.preventDefault();
 const moduleId=document.getElementById("builderModuleId").value;
 const title=document.getElementById("builderTitle").value;
 const desc=document.getElementById("builderDescription").value;
 const sectionTitle=document.getElementById("builderSectionTitle").value;
 const content=document.getElementById("builderContent").value;
 const question=document.getElementById("builderQuestion").value;
 const options=document.getElementById("builderOptions").value.split(",");
 const correct=document.getElementById("builderCorrect").value;

 await setDoc(doc(db,"trainingModules",moduleId),{title,description:desc});
 await setDoc(doc(db,"trainingSections",Date.now()+"_sec"),{
  moduleId,sectionId:Date.now(),order:1,title:sectionTitle,content
 });
 await setDoc(doc(db,"trainingQuestions",Date.now()+"_q"),{
  moduleId,sectionId:Date.now(),question,options,correctAnswer:correct
 });

 document.getElementById("builderMessage").textContent="Training saved.";
 loadModules();
}

document.getElementById("trainingBuilderForm")?.addEventListener("submit",saveTraining);
document.getElementById("logoutBtn").onclick=()=>{localStorage.removeItem(SESSION_KEY);window.location.href="index.html"};

requireAuth();
loadModules();
