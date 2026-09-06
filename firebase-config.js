// ============================================================
// FIREBASE CONFIG — fill this in with your own project's keys
// Firebase console → Project settings → General → Your apps → SDK config
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQDLLkpO7XofH_J8q5G9_AgtSBouX6Ifg",
  authDomain: "youth-fiesta-live-score.firebaseapp.com",
  projectId: "youth-fiesta-live-score",
  storageBucket: "youth-fiesta-live-score.firebasestorage.app",
  messagingSenderId: "384170336172",
  appId: "1:384170336172:web:80998108c9ea050331e409",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// House IDs are fixed — the four houses of Cardinal Youth Fiesta.
// Edit icon/label here if a house name ever changes; points always live in Firestore.
export const HOUSES = {
  yellow: { label: "Yellow House", icon: "🦁" },
  green:  { label: "Green House",  icon: "🍃" },
  blue:   { label: "Blue House",   icon: "🌊" },
  red:    { label: "Red House",    icon: "🔥" }
};
