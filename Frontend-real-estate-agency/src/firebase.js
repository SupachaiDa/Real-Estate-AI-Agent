// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
	apiKey: "AIzaSyDly970tgtXRwtccalL-vHAIG8kFwAqeCs",
	authDomain: "aigenz-7edde.firebaseapp.com",
	projectId: "aigenz-7edde",
	storageBucket: "aigenz-7edde.firebasestorage.app",
	messagingSenderId: "403773845140",
	appId: "1:403773845140:web:d52f98967a540ead780e81",
	measurementId: "G-BPHRN9NJHG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
