import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB-SUV-SOjtToKItlOqGfUnk7diN6geoj8",
  authDomain: "we3project-vision.firebaseapp.com",
  projectId: "we3project-vision",
  storageBucket: "we3project-vision.appspot.com",
  messagingSenderId: "273738596472",
  appId: "1:273738596472:web:73b3e2222912598e0c2d8d",
  measurementId: "G-T5X8QW6LBE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
