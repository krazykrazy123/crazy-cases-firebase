// src/utils/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ────────────────────────────────────────────────
//  Your Firebase config (copied from what you sent)
const firebaseConfig = {
  apiKey:            "AIzaSyAFT6AggepSc35Lek1gal2jwL58xbDaLU0",
  authDomain:        "crazy-cases-firebase.firebaseapp.com",
  projectId:         "crazy-cases-firebase",
  storageBucket:     "crazy-cases-firebase.firebasestorage.app",
  messagingSenderId: "557760391539",
  appId:             "1:557760391539:web:7fcbb5419fa18a84f9bd06",
  measurementId:     "G-VMETGCGK5Q"   // ← we can ignore this for now (Analytics)
};

// Initialize the Firebase app (only once)
const app = initializeApp(firebaseConfig);

// Export the services we actually need right now
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Optional: if you later want Analytics, uncomment this:
// import { getAnalytics } from "firebase/analytics";
// export const analytics = getAnalytics(app);