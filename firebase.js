import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import { 
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAi3IUlL2mZRBsWcpV7aCA3SjDzWdLFefU",
  authDomain: "echostate-9c9a2.firebaseapp.com",
  projectId: "echostate-9c9a2",
  storageBucket: "echostate-9c9a2.firebasestorage.app",
  messagingSenderId: "278139700352",
  appId: "1:278139700352:web:7080c43f860b28d1dc5265"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Expose globally
window.firebaseAuth = auth;
window.firebaseDB = db;

// DOM elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

// Login
loginBtn.onclick = () => signInWithPopup(auth, provider);

// Logout
logoutBtn.onclick = () => signOut(auth);

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userEmail.innerText = user.email;

    window.currentUser = user;

    loadUserSongs(user.uid);

  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userEmail.innerText = "";
    window.currentUser = null;

    if (window.EchoState) {
      window.EchoState.songs = [];

      if (window.EchoState.pieChart) {
        window.EchoState.pieChart.data.labels = [];
        window.EchoState.pieChart.data.datasets[0].data = [];
        window.EchoState.pieChart.update();
      }

      if (window.EchoState.trendChart) {
        window.EchoState.trendChart.data.labels = [];
        window.EchoState.trendChart.data.datasets[0].data = [];
        window.EchoState.trendChart.update();
      }

      window.EchoState.updateUI();
    }
  }
});

// Real-time listener
function loadUserSongs(uid) {
  const q = query(collection(db, "songs"), where("uid", "==", uid));

  onSnapshot(q, (snapshot) => {
    const songs = [];

    snapshot.forEach(docSnap => {
      songs.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (window.EchoState) {
      window.EchoState.songs = songs;
      window.EchoState.updateUI();
    }
  });
}

// Save song
window.saveSongToCloud = async function(song) {
  if (!window.currentUser) return;

  await addDoc(collection(db, "songs"), {
    ...song,
    uid: window.currentUser.uid
  });
};

// Delete song
window.deleteSongFromCloud = async function(docId) {
  if (!window.currentUser) return;

  await deleteDoc(doc(db, "songs", docId));
};