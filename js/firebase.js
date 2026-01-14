import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6QZqAgg6sGpz0vlwZHuffyzcQNRCTxmA",
  authDomain: "handiman-web.firebaseapp.com",
  projectId: "handiman-web",
  storageBucket: "handiman-web.firebasestorage.app",
  messagingSenderId: "241549719335",
  appId: "1:241549719335:web:4d90f014753746e1bb9b02"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);


console.log("🔥 Firebase initialized");