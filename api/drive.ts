import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
      scopes: ['https://www.googleapis.com/auth/drive'], // 👈 전체 권한 유지!
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
