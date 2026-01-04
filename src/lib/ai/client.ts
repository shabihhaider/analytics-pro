
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not found, AI features will be limited');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

// Use the robust model (2.5 Flash is standard in 2026)
export const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
