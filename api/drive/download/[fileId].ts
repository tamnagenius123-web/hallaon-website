// Vercel Serverless Function — Google Drive Download
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const drive = getDriveClient();
  if (!drive) return res.status(500).json({ error: 'Drive not configured' });

  const { fileId } = req.query;
  const { name } = req.query;

  try {
    const response = await drive.files.get(
      { fileId: fileId as string, alt: 'media' },
      { responseType: 'stream' }
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(name as string) || 'download'}"`
    );
    (response.data as any).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
