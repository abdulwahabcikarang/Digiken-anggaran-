import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function run() {
  console.log("Logging in...", process.env.FIREBASE_BOT_EMAIL);
  const uc = await signInWithEmailAndPassword(auth, process.env.FIREBASE_BOT_EMAIL as string, process.env.FIREBASE_BOT_PASSWORD as string);
  console.log("Logged in:", uc.user.uid);
  console.log("Writing to phoneDirectory...");
  await setDoc(doc(db, "phoneDirectory", "628999999999"), { userId: "testUser" });
  await setDoc(doc(db, "userState", "testUser"), {
    userProfile: { name: "Test User" },
    budgets: [],
    dailyExpenses: []
  });
  console.log("Mock data inserted.");
}
run().catch(console.error);
