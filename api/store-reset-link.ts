import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getAdminAuth } = require('./_firebaseAdmin.cjs');
const { requireAdmin } = require('./_requireAdmin.cjs');

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  on?: (event: string, callback: (chunk?: unknown) => void) => void;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: Record<string, unknown>) => void;
};

const readRequestBody = (req: VercelRequest) =>
  new Promise<string>((resolve, reject) => {
    if (!req.on) {
      resolve('');
      return;
    }

    let raw = '';
    req.on('data', (chunk) => {
      raw += String(chunk ?? '');
    });
    req.on('end', () => resolve(raw));
    req.on('error', (error) => reject(error));
  });

const getJsonBody = async (req: VercelRequest) => {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }

  const rawBody = await readRequestBody(req);
  if (!rawBody.trim()) return {};
  return JSON.parse(rawBody);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  try {
    await requireAdmin(req);

    const { email } = (await getJsonBody(req)) as { email?: string };

    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email da loja e obrigatorio.' });
    }

    const link = await getAdminAuth().generatePasswordResetLink(email.trim());
    return res.status(200).json({ link });
  } catch (error) {
    console.error('store-reset-link error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno.';
    return res.status(500).json({ error: message });
  }
}
