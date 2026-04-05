/**
 * Vercel Serverless Function — Discord Webhook Notification
 * POST /api/notifications/discord
 * 
 * 두 가지 형식의 요청을 처리합니다:
 * 1. 프론트엔드에서: { message: string }
 * 2. Supabase DB Webhook에서: { type: 'INSERT'|'UPDATE'|'DELETE', table: string, record: object }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS: restrict to allowed origins
  const allowedOrigins = [
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some(o => origin.startsWith(o || '')) || !origin;
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin || '' : '');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Discord Webhook URL not configured' });
  }

  try {
    let discordMessage = '';

    // Supabase Database Webhook 요청 처리
    if (req.body.type && req.body.record) {
      const { type, table, record } = req.body;
      const title = record.title || record.content || record.name || '새 항목';
      
      const actionEmoji = {
        'INSERT': '✨',
        'UPDATE': '🔄',
        'DELETE': '🗑️'
      }[type] || '📝';

      discordMessage = `${actionEmoji} **[${table.toUpperCase()}]** ${type === 'INSERT' ? '새로운 항목이 추가되었습니다' : type === 'UPDATE' ? '항목이 수정되었습니다' : '항목이 삭제되었습니다'}: **${title}**`;
    }
    // 프론트엔드에서 직접 보낸 메시지 처리
    else if (req.body.message && typeof req.body.message === 'string') {
      discordMessage = req.body.message;
    }
    else {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Discord로 메시지 전송
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: discordMessage.slice(0, 2000) // Discord 메시지 길이 제한
      }),
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Discord notification sent' });
    } else {
      const errorText = await response.text();
      return res.status(500).json({ 
        error: 'Discord API error', 
        details: errorText 
      });
    }
  } catch (error: any) {
    console.error('Discord notification error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
