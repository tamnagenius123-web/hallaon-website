/**
 * API Authentication Middleware
 * Verifies Supabase JWT tokens for API endpoint protection
 */
import { createClient } from '@supabase/supabase-js';

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

/**
 * Verify authentication from Authorization header
 * Returns the user object if valid, null otherwise
 */
export async function verifyAuth(authHeader: string | undefined): Promise<{
  authenticated: boolean;
  user?: any;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false };
  }

  const token = authHeader.replace('Bearer ', '');
  const admin = getSupabaseAdmin();
  if (!admin) return { authenticated: false };

  try {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return { authenticated: false };
    return { authenticated: true, user };
  } catch {
    return { authenticated: false };
  }
}

/**
 * CORS helper for API endpoints
 */
export function setCorsHeaders(req: any, res: any): boolean {
  const allowedOrigins = [
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);

  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some((o: string) => origin.startsWith(o || '')) || !origin;

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin || '' : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
