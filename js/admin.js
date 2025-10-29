import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-7udHLwaIF-PaGfb_yjgf7zkz6wrLKFU",
  authDomain: "portal-tripnas.firebaseapp.com",
  projectId: "portal-tripnas",
  storageBucket: "portal-tripnas.firebasestorage.app",
  messagingSenderId: "664623452933",
  appId: "1:664623452933:web:1f6018c0eff3c1a7c09d6c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
