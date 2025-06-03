
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyChWq-3GHenAik2YNoptMXrlJbRFHzp3CA",
  authDomain: "v3ga-firebase.firebaseapp.com",
  databaseURL: "https://v3ga-firebase-default-rtdb.firebaseio.com",
  projectId: "v3ga-firebase",
  storageBucket: "v3ga-firebase.firebasestorage.app",
  messagingSenderId: "534082845337",
  appId: "1:534082845337:web:be6e04de73080a4d311608"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
