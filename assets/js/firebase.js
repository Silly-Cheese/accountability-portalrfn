import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCCvG-t_tFDGcBDyyAwjObYEsT68zLjeU",
  authDomain: "rfnaccountability.firebaseapp.com",
  projectId: "rfnaccountability",
  storageBucket: "rfnaccountability.firebasestorage.app",
  messagingSenderId: "76272144827",
  appId: "1:76272144827:web:57db0de1f3826f5c9bb49e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

export async function ensureCoreCollections() {
  const defaults = [
    { col: "systemSettings", id: "core", data: { initialized: true, portalName: "RFN Accountability Portal" } },
    { col: "users", id: "341479", data: {
        employeeId: "341479",
        username: "Executive_Eagle",
        role: "CEO",
        password: "change-this-password",
        mustResetPassword: true,
        strikes: 0,
        active: true,
        suspended: false
      }
    }
  ];

  for (const item of defaults) {
    const ref = doc(db, item.col, item.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, item.data);
  }
}
