import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAFT6AggepSc35Lek1gal2jwL58xbDaLU0",
  authDomain: "crazy-cases-firebase.firebaseapp.com",
  projectId: "crazy-cases-firebase",
  storageBucket: "crazy-cases-firebase.firebasestorage.app",
  messagingSenderId: "557760391539",
  appId: "1:557760391539:web:7fcbb5419fa18a84f9bd06",
  measurementId: "G-VMETGCGK5Q"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);