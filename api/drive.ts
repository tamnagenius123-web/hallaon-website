import { google } from 'googleapis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 처리
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
      // 👇 권한을 읽기/쓰기가 모두 가능한 전체 권한으로 올렸습니다!
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // ─────────────────────────────────────────────────────────
    // 1. 파일 목록 불러오기 (GET)
    // ─────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const folderId = req.query.folderId as string || process.env.GOOGLE_DRIVE_FOLDER_ID;
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, iconLink, webViewLink, size, modifiedTime)',
        orderBy: 'folder,name',
      });
      return res.status(200).json(response.data.files);
    }

    // ─────────────────────────────────────────────────────────
    // 2. 파일 업로드 하기 (POST)
    // ─────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { name, mimeType, base64, folderId } = req.body;
      const targetFolder = folderId === 'root' ? process.env.GOOGLE_DRIVE_FOLDER_ID : folderId;

      // Base64 문자열을 실제 파일(Buffer)로 변환
      const buffer = Buffer.from(base64, 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // 구글 드라이브로 전송
      const response = await drive.files.create({
        requestBody: {
          name: name,
          parents: [targetFolder!], // 현재 보고 있는 폴더에 저장
        },
        media: {
          mimeType: mimeType,
          body: stream,
        },
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
