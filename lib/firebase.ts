import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAdZRzekxzqnccHUOxL7sU3J3x9uq55Pj8",
  authDomain: "checkin-app-8e6f3.firebaseapp.com",
  projectId: "checkin-app-8e6f3",
  storageBucket: "checkin-app-8e6f3.firebasestorage.app",
  messagingSenderId: "272995044414",
  appId: "1:272995044414:web:9946ba6be49edc0f84556f"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);