import dotenv from "dotenv";
dotenv.config();
console.log("FONNTE_TOKEN: ", process.env.FONNTE_TOKEN ? "FOUND" : "MISSING");
