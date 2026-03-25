// Vercel Serverless Function — Google Drive API
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const getDriveClient = () => {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const creds = JSON.parse(json);
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    return google.drive({ version: 'v3', auth });
  } catch {
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const drive = getDriveClient();
  if (!drive) {
    return res.status(500).json({ error: 'Google Drive not configured' });
  }

  try {
    const folderId =
      (req.query.folderId as string) || process.env.GOOGLE_DRIVE_FOLDER_ID;

    const q = folderId && folderId !== 'root'
      ? `'${folderId}' in parents and trashed = false`
      : undefined;

    const response = await drive.files.list({
      q,
      fields: 'files(id,name,mimeType,webViewLink,iconLink,size,modifiedTime)',
      orderBy: 'folder,name',
      pageSize: 200,
    });

    return res.status(200).json(response.data.files ?? []);
  } catch (err: any) {
    console.error('Drive API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
