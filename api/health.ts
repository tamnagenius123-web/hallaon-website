/**
 * Vercel Serverless Function — Health Check
 * GET /api/health
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({
    status: 'ok',
    message: 'HALLAON Workspace API is running',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
  });
}
