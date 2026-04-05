/**
 * Vercel Serverless Function — AI Natural Language Task Parser
 * POST /api/ai/parse-task
 * Parses natural language text into structured task data using Gemini
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

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const today = new Date().toISOString().split('T')[0];

  const prompt = `다음 자연어 텍스트를 분석하여 프로젝트 태스크 정보를 JSON으로 추출하세요.
오늘 날짜: ${today}

입력: "${text}"

추출할 필드:
- title: 태스크 제목
- assignee: 담당자 이름 (없으면 빈 문자열)
- team: 팀명 (PM, CD, FS, DM, OPS 중 하나, 없으면 "PM")
- start_date: 시작일 (YYYY-MM-DD, 없으면 오늘)
- end_date: 마감일 (YYYY-MM-DD, 없으면 시작일 + 7일)
- opt_time: 낙관적 소요일수 (추정, 정수)
- prob_time: 기대 소요일수 (추정, 정수)
- pess_time: 비관적 소요일수 (추정, 정수)
- status: 상태 (기본값 "시작 전")

JSON 형식으로만 응답하세요:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) return res.status(500).json({ error: 'Empty AI response' });

    const parsed = JSON.parse(resultText);
    return res.status(200).json({ success: true, task: parsed });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
