/**
 * Vercel Serverless Function — AI Smart Task Assignment
 * POST /api/ai/smart-assign
 * Recommends optimal assignee based on workload analysis using Gemini
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

  const { taskTitle, taskTeam, members } = req.body;
  if (!taskTitle || !members || !Array.isArray(members)) {
    return res.status(400).json({ error: 'taskTitle and members array are required' });
  }

  const prompt = `당신은 프로젝트 관리 AI입니다. 다음 새 태스크에 가장 적합한 담당자를 추천하세요.

새 태스크:
- 제목: ${taskTitle}
- 팀: ${taskTeam || '미지정'}

팀원별 현재 상황:
${members.map((m: any) => `- ${m.name}: 진행 중 ${m.activeTasks}건, 완료 ${m.completedTasks}건, 막힘 ${m.blockedTasks}건`).join('\n')}

각 팀원에 대해 적합도 점수(0-100)와 간단한 이유를 JSON 배열로 응답하세요:
[{"name": "이름", "score": 85, "reason": "이유"}]

업무량이 적고 해당 팀에 속한 멤버를 우선 추천하세요.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) return res.status(500).json({ error: 'Empty AI response' });

    const recommendations = JSON.parse(resultText);
    return res.status(200).json({
      success: true,
      recommendations: Array.isArray(recommendations)
        ? recommendations.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
        : recommendations,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
