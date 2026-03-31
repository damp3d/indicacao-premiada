import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getAdminAuth } = require('./_firebaseAdmin.cjs');
const { requireAdmin } = require('./_requireAdmin.cjs');

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: Record<string, unknown>) => void;
};

const getJsonBody = (req: VercelRequest) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }
  return req.body as Record<string, unknown>;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  try {
    await requireAdmin(req);

    const { email } = getJsonBody(req) as { email?: string };

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
