/**
 * Vercel Serverless Function — AI Weekly Sprint Report
 * GET /api/ai/weekly-report?send_discord=true
 * Generates AI-powered weekly report using Gemini
 * Can be triggered by Vercel Cron Job
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET for cron, POST for manual
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  try {
    const [
      { data: tasks },
      { data: agendas },
      { data: meetings },
    ] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('agendas').select('*').gte('proposed_date', weekAgo),
      supabase.from('meetings').select('*').gte('date', weekAgo),
    ]);

    const prompt = `다음 주간 프로젝트 데이터를 분석하여 한국어 주간 스프린트 리포트를 작성하세요:

## 태스크 현황 (총 ${tasks?.length || 0}건)
${JSON.stringify(tasks?.map(t => ({ title: t.title, status: t.status, team: t.team, assignee: t.assignee })).slice(0, 50))}

## 이번 주 안건 (${agendas?.length || 0}건)
${JSON.stringify(agendas?.map(a => ({ title: a.title, status: a.status })))}

## 이번 주 회의 (${meetings?.length || 0}건)
${JSON.stringify(meetings?.map(m => ({ title: m.title, category: m.category })))}

다음 형식으로 작성:
1. 📊 주간 요약 (핵심 수치)
2. ✅ 이번 주 성과
3. ⚠️ 주의 사항 및 리스크
4. 🎯 다음 주 집중 포인트
5. 💡 개선 제안`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const aiData = await aiResponse.json();
    const report = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '리포트 생성 실패';

    // Send to Discord if requested
    if ((req.query.send_discord === 'true' || req.body?.send_discord) && process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: report.slice(0, 2000) }),
      });
    }

    return res.status(200).json({ success: true, report });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
