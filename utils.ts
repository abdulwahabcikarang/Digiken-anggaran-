
import { PERSONA_INSTRUCTIONS } from './constants';
import { Blob as GenAIBlob } from '@google/genai';

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ScannedItem } from './types';

export const processBatchScreenshot = async (base64Image: string, apiKey: string): Promise<ScannedItem[]> => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analisis gambar screenshot aplikasi pengelola keuangan ini. 
    Ekstrak SEMUA transaksi yang terlihat. 
    Untuk setiap transaksi, ambil:
    1. Deskripsi/Nama Transaksi
    2. Nominal (Angka saja)
    3. Tanggal (Jika ada tahun gunakan tahun tersebut, jika tidak ada asumsikan tahun 2026 sesuai konteks aplikasi ini. Format: YYYY-MM-DD)
    4. Kategori (Tebak kategori yang paling cocok: Makan, Transportasi, Belanja, Kesehatan, Hiburan, atau Lainnya)

    Berikan jawaban HANYA dalam format JSON ARRAY seperti ini:
    [{"desc": "Beli Bakso", "amount": 15000, "timestamp": 1712275200000, "category": "Makan"}]
    
    Catatan: Ubah tanggal menjadi timestamp milidetik.
    PENTING: Hanya berikan JSON, jangan ada teks lain.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "image/png", data: base64Image } }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        if (!text) throw new Error("AI tidak memberikan respon.");
        
        const results = JSON.parse(text.trim());
        return results.map((item: any) => ({
            ...item,
            budgetId: 'none' // Default to none as requested (only history)
        }));
    } catch (error) {
        console.error("AI Batch Processing Error:", error);
        throw new Error("Gagal memproses gambar. Pastikan gambar jelas dan koneksi internet stabil.");
    }
};

export const formatCurrency = (amount: number) => {
    if (amount >= 100000000000) { // If > 11 digits (100 Billion)
        return amount.toExponential(2).replace('+', '');
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export const formatNumberInput = (value: string | number) => {
    const numString = String(value).replace(/[^0-9]/g, '');
    if (numString === '') return '';
    return new Intl.NumberFormat('id-ID').format(Number(numString));
};

export const getRawNumber = (value: string) => Number(value.replace(/[^0-9]/g, ''));

export const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

export const getApiKey = (): string => {
    let key = '';
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            key = process.env.API_KEY;
        }
    } catch (e) {}

    if (!key) {
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
                // @ts-ignore
                key = import.meta.env.VITE_API_KEY;
            }
        } catch (e) {}
    }
    return key;
};

export const getSystemInstruction = (personaId?: string): string => {
    const base = PERSONA_INSTRUCTIONS[personaId || 'default'] || PERSONA_INSTRUCTIONS['default'];
    return `${base} Jawablah selalu dalam Bahasa Indonesia.`;
};

// --- Level Utility ---
export const calculateLevelInfo = (totalPoints: number) => {
    const levelNumber = Math.floor(Math.sqrt(totalPoints / 50)) + 1;
    const currentStartXP = 50 * Math.pow(levelNumber - 1, 2);
    const nextTargetXP = 50 * Math.pow(levelNumber, 2);
    
    const rankTitles = [
        "Pemula Finansial", "Pelajar Hemat", "Perencana Cerdas", "Pengelola Aset", 
        "Juragan Strategi", "Investor Ulung", "Master Anggaran", "Sultan Muda", 
        "Taipan Global", "Legenda Abadi"
    ];
    const rankIndex = Math.min(rankTitles.length - 1, Math.floor((levelNumber - 1) / 5));

    return {
        levelNumber,
        levelTitle: rankTitles[rankIndex],
        currentStartXP,
        nextTargetXP,
        xpInCurrentLevel: totalPoints - currentStartXP,
        xpRequiredForNext: nextTargetXP - currentStartXP,
        totalXP: totalPoints
    };
};

// --- Audio Utility functions ---
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Encryption Utilities ---
const SECRET_SALT = "ANGGARAN_SECURE_KEY_X9"; 

export const encryptData = (data: any): string => {
    try {
        const jsonStr = JSON.stringify(data);
        // Encode to URI component to handle Unicode/Emoji correctly
        const uriEncoded = encodeURIComponent(jsonStr);
        
        let result = '';
        for (let i = 0; i < uriEncoded.length; i++) {
            result += String.fromCharCode(uriEncoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
        }
        return btoa(result);
    } catch (e) {
        console.error("Encryption failed", e);
        throw new Error("Gagal mengenkripsi data");
    }
};

export const decryptData = (cipherText: string): any => {
    try {
        const decoded = atob(cipherText);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
        }
        // Decode back from URI component
        const jsonStr = decodeURIComponent(result);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Decryption failed", e);
        throw new Error("File data rusak atau tidak valid.");
    }
};
