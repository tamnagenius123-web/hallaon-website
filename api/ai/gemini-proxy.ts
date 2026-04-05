/**
 * Vercel Serverless Function — Gemini API Proxy
 * POST /api/ai/gemini-proxy
 * Keeps GEMINI_API_KEY server-side only
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowedOrigins = [
  process.env.APP_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some(o => origin.startsWith(o || '')) || !origin;
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin || '' : '');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { prompt, model, generationConfig } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(generationConfig ? { generationConfig } : {}),
        }),
      }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
