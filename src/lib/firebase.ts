import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyCY-CT2FyQwM7CqipHcP_JH6yfMHFTkwLU",
  authDomain: "nova-6eb74.firebaseapp.com",
  projectId: "nova-6eb74",
  storageBucket: "nova-6eb74.firebasestorage.app",
  messagingSenderId: "151676798105",
  appId: "1:151676798105:web:4b7ef3fc82855029326408",
  measurementId: "G-HMFTHZDRXF"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

export { app, auth, db, storage, googleProvider, githubProvider, appleProvider };
