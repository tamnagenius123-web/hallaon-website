/**
 * Vercel Serverless Function — Google Drive Download
 * GET /api/drive/download/:fileId
 * 302 redirect for large files, direct stream for small files
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export const config = { maxDuration: 10 };

const FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,80}$/;

const allowedOrigins = [
  process.env.APP_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some(o => origin.startsWith(o || '')) || !origin;
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin || '' : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

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
  if (setCors(req, res)) return;

  const drive = getDriveClient();
  if (!drive) return res.status(500).json({ error: 'Drive not configured' });

  const { fileId } = req.query;

  // Validate fileId format
  if (!fileId || !FILE_ID_REGEX.test(fileId as string)) {
    return res.status(400).json({ error: 'Invalid file ID format' });
  }

  try {
    // Get file metadata first
    const meta = await drive.files.get({
      fileId: fileId as string,
      fields: 'id, name, size, webContentLink',
    });

    const fileSize = parseInt(meta.data.size || '0', 10);
    const fileName = (req.query.name as string) || meta.data.name || 'download';

    // Small files (<=3MB): direct stream (safe within Vercel timeout)
    if (fileSize > 0 && fileSize <= 3 * 1024 * 1024) {
      const response = await drive.files.get(
        { fileId: fileId as string, alt: 'media' },
        { responseType: 'stream' }
      );
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', fileSize.toString());
      (response.data as any).pipe(res);
      return;
    }

    // Large files: 302 redirect to webContentLink
    if (meta.data.webContentLink) {
      return res.redirect(302, meta.data.webContentLink);
    }

    // No webContentLink (Google Docs etc) — fallback
    return res.status(400).json({
      error: 'File too large for direct download. Open in browser.',
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
