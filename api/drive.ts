import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security: Restrict CORS to known origins (set your Vercel domain)
  const allowedOrigins = [
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);

  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some(o => origin.startsWith(o || '')) || !origin;

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin || '*' : allowedOrigins[0] || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file', // app-created files only
      ],
    });

    const drive = google.drive({ version: 'v3', auth });

    if (req.method === 'GET') {
      const folderId = req.query.folderId as string || process.env.GOOGLE_DRIVE_FOLDER_ID;
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, iconLink, webViewLink, size, modifiedTime)',
        orderBy: 'folder,name',
      });
      return res.status(200).json(response.data.files);
    }

    if (req.method === 'POST') {
      const { name, mimeType, textContent, base64, folderId } = req.body;
      const targetFolder = folderId === 'root' ? process.env.GOOGLE_DRIVE_FOLDER_ID : folderId;

      const media: any = { mimeType };
      
      // 👇 여기가 핵심입니다! 텍스트면 다이렉트로, 파일이면 스트림으로!
      if (textContent) {
        media.body = textContent; 
      } else if (base64) {
        const { Readable } = await import('stream');
        const buffer = Buffer.from(base64, 'base64');
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        media.body = stream;
      }

      const response = await drive.files.create({
        requestBody: { name: name, parents: [targetFolder!] },
        media: media,
        fields: 'id, name, webViewLink',
      });

      return res.status(200).json({ success: true, file: response.data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Google Drive API Error:', error);
    return res.status(500).json({ error: 'Drive API failed', details: error.message });
  }
}
