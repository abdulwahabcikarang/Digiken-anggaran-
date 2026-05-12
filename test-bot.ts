import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

dotenv.config();

async function testBot() {
    const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    let firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);
    
    const email = process.env.FIREBASE_BOT_EMAIL;
    const password = process.env.FIREBASE_BOT_PASSWORD;
    
    console.log("Email from env:", email ? "Found" : "Missing");
    console.log("Password from env:", password ? "Found" : "Missing");
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email!, password!);
        console.log("Bot login Success! UID:", userCredential.user.uid);
    } catch(e: any) {
        console.error("Bot login Failed:", e.message);
    }
}
testBot();
