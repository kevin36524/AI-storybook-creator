import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import { GoogleGenAI } from '@google/genai';

// --- VALIDATE ENVIRONMENT VARIABLES ---
if (!process.env.API_KEY) {
  throw new Error('FATAL ERROR: API_KEY environment variable not set.');
}
if (!process.env.GCS_BUCKET_NAME) {
  throw new Error('FATAL ERROR: GCS_BUCKET_NAME environment variable not set.');
}
if (!process.env.FIRESTORE_DATABASE_ID) {
    throw new Error('FATAL ERROR: FIRESTORE_DATABASE_ID environment variable not set.');
}

// --- INITIALIZE GEMINI ---
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- INITIALIZE GCS ---
const storage = new Storage();
export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// --- INITIALIZE FIRESTORE ---
const db = new Firestore({
    databaseId: process.env.FIRESTORE_DATABASE_ID,
});
export const storiesCollection = db.collection('stories');
