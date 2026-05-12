import express from "express";
import path from "path";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseConfig = {};
try {
    const configPath1 = path.join(__dirname, "firebase-applet-config.json");
    const configPath2 = path.join(process.cwd(), "firebase-applet-config.json");
    const configPath3 = path.join(__dirname, "..", "firebase-applet-config.json");
    const finalPath = fs.existsSync(configPath1) ? configPath1 : (fs.existsSync(configPath2) ? configPath2 : configPath3);
    firebaseConfig = JSON.parse(fs.readFileSync(finalPath, "utf-8"));
} catch (e) {
    console.error("Could not read firebase-applet-config.json", e);
}

dotenv.config();

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId);

// Login Bot
async function loginBot() {
    const email = process.env.FIREBASE_BOT_EMAIL;
    const password = process.env.FIREBASE_BOT_PASSWORD;
    if (!email || !password) {
        console.log("Firebase Bot Email/Password not found in .env. Bot features disabled.");
        return null;
    }
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Bot logged in successfully as", userCredential.user.uid);
        return userCredential.user.uid;
    } catch (e) {
        console.error("Bot login failed:", e);
        return null;
    }
}

async function sendFonnteMessage(target: string, text: string) {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
        console.error("FONNTE_TOKEN is missing!");
        return;
    }
    try {
        const response = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                target: target,
                message: text
            })
        });
        const data = await response.json();
        console.log("Fonnte Response:", data);
    } catch (error) {
        console.error("Error sending Fonnte message:", error);
    }
}

async function handleWhatsAppMessage(sender: string, message: string) {
    if (!sender) return;
    
    sender = sender.replace(/\D/g, ''); // Ensure sender is numeric

    try {
        // 1. Get UserId from phoneDirectory
        const phoneDoc = await getDoc(doc(db, 'phoneDirectory', sender));
        if (!phoneDoc.exists()) {
            console.log(`Phone number ${sender} not registered in phoneDirectory.`);
            await sendFonnteMessage(sender, "Nomor WhatsApp Anda belum terdaftar di aplikasi Anggaran. Silakan buka aplikasi Anggaran, masuk ke Pengaturan WhatsApp, dan daftarkan nomor ini bersama dengan Email Bot.");
            return;
        }

        const userId = phoneDoc.data().userId;
        
        // 2. Fetch User State
        const userDoc = await getDoc(doc(db, 'userState', userId));
        if (!userDoc.exists()) {
            console.log(`User ${userId} state not found.`);
            return;
        }

        const state: any = userDoc.data();
        
        console.log("User state successfully retrieved for:", state.userProfile.name);

        // 3. Process with Gemini
        // We prompt Gemini to output a specific JSON structure based on the message.
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        const prompt = `
Anda adalah Asisten Keuangan Pribadi (AI) yang terhubung via WhatsApp.
Data Anggaran Bulanan Pengguna Saat Ini:
${JSON.stringify(state.budgets.map((b: any) => ({id: b.id, name: b.name, totalBudget: b.totalBudget, spent: b.history.reduce((sum: number, tx: any) => sum + tx.amount, 0)})))}

Tugas Anda:
1. Menganalisis pesan WhatsApp dari pengguna: "${message}"
2. Jika pesan adalah tentang MENCATAT PENGELUARAN (Expense), kembalikan JSON dengan format:
{
  "action": "record_expense",
  "data": {
    "desc": "Nama pengeluaran",
    "amount": 10000,
    "budgetId": 1 // ID Anggaran yang paling cocok (pilih dari data anggaran di atas), atau "none" jika tidak ada yang cocok
  },
  "reply": "Balasan ramah untuk dikirim ke WhatsApp, konfirmasi pencatatan, sebutkan sisa uangnya, berikan emoji lucu."
}

3. Jika pesan adalah BERTANYA (Query) tentang keuangan mereka (misal "Sisa uang makanku berapa?"):
{
  "action": "reply_only",
  "reply": "Balasan ramah dengan informasi yang diminta, berikan tips hemat."
}

OUTPUT HARUS STRICTLY JSON (TANPA MARKDOWN, TANPA TEKS LAINNYA).
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const textResponse = response.text;
        if (!textResponse) throw new Error("Empty AI response");

        const parsed = JSON.parse(textResponse);

        if (parsed.action === "record_expense" && parsed.data) {
            // Update Firestore with the new transaction
            const budgetId = parsed.data.budgetId;
            const budgetIndex = state.budgets.findIndex((b: any) => b.id === budgetId);
            
            const newTx = {
                desc: parsed.data.desc,
                amount: parsed.data.amount,
                timestamp: Date.now()
            };

            let updatedBudgets = [...state.budgets];
            let updatedDaily = [...state.dailyExpenses];

            if (budgetIndex !== -1) {
                updatedBudgets[budgetIndex].history.push(newTx);
            } else if (budgetId === "daily" || budgetId === "none" || !budgetId) {
                updatedDaily.push(newTx);
            }

            // Write back to Firestore
            await updateDoc(doc(db, 'userState', userId), {
                budgets: updatedBudgets,
                dailyExpenses: updatedDaily
            });

            console.log("Successfully recorded expense via WhatsApp.");
        }

        // 4. Send Reply via Fonnte
        if (parsed.reply) {
            await sendFonnteMessage(sender, parsed.reply);
        }

    } catch (error) {
        console.error("Error processing WhatsApp message:", error);
    }
}

const app = express();
let isInitialized = false;

export async function initServer() {
  if (isInitialized) return app;
  
  // Middleware for parsing JSON
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Wait for bot to login
  await loginBot();

  // Fonnte Webhook Endpoint (handles various paths including the root in case user didn't add /api/webhook)
  app.post(["/", "/api/webhook", "/webhook", "/api/webhook/"], async (req, res) => {
    try {
      console.log(`[Webhook] ${req.method} request received at ${req.url}`);
      const payload = req.method === 'GET' ? req.query : req.body;
      console.log(`[Webhook Payload Detail] req.body:`, typeof req.body, req.body, `req.query:`, req.query, `Content-Type:`, req.headers['content-type']);
      const sender = typeof payload.sender === 'string' ? payload.sender : (typeof payload.pengirim === 'string' ? payload.pengirim : ''); // Fallbacks
      const message = typeof payload.message === 'string' ? payload.message : (typeof payload.pesan === 'string' ? payload.pesan : '');
      
      if (!sender || !message) {
          console.log(`[Webhook] Missing sender or message in payload:`, payload);
          return res.status(200).send("OK");
      }

      console.log(`Received message from ${sender}: ${message}`);
      
      // Handle the logic correctly
      await handleWhatsAppMessage(sender, message);
      
      // Reply immediately so Fonnte doesn't disconnect/timeout
      res.status(200).send("OK");
      
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Server error");
    }
  });

  app.get(["/api/webhook", "/webhook", "/api/webhook/"], async (req, res) => {
    try {
      console.log(`[Webhook] ${req.method} request received`);
      const payload = req.query;
      const sender = typeof payload.sender === 'string' ? payload.sender : (typeof payload.pengirim === 'string' ? payload.pengirim : '');
      const message = typeof payload.message === 'string' ? payload.message : (typeof payload.pesan === 'string' ? payload.pesan : '');
      
      if (!sender || !message) {
          console.log(`[Webhook] Missing sender or message in payload:`, payload);
          return res.status(200).send("OK");
      }

      console.log(`Received message from ${sender}: ${message}`);
      
      // Handle the logic correctly
      await handleWhatsAppMessage(sender, message);
      
      // Reply immediately so Fonnte doesn't disconnect/timeout
      res.status(200).send("OK");
      
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Catch-all for POST to log any missing webhooks
  app.post("*all", (req, res) => {
    console.log(`[POST Fallback] Unmatched POST request to: ${req.url}`);
    console.log(`[POST Fallback] Body:`, req.body);
    res.status(404).send("Not Found");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Only serve static files if we're not running as a Vercel serverless function
    if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  isInitialized = true;
  return app;
}

// Start the server if running locally (not imported as a module in Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  initServer().then((app) => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
