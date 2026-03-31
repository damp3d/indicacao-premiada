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

    const { uid, email, password, displayName } = getJsonBody(req) as {
      uid?: string;
      email?: string;
      password?: string;
      displayName?: string;
    };

    const adminAuth = getAdminAuth();

    if (uid) {
      const payload: Record<string, string> = {};

      if (email?.trim()) payload.email = email.trim();
      if (password?.trim()) payload.password = password.trim();
      if (displayName?.trim()) payload.displayName = displayName.trim();

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'Nenhuma alteracao foi informada para a conta da loja.' });
      }

      const userRecord = await adminAuth.updateUser(uid, payload);
      return res.status(200).json({ uid: userRecord.uid, email: userRecord.email });
    }

    if (!email?.trim() || !password?.trim() || !displayName?.trim()) {
      return res.status(400).json({ error: 'Email, senha e nome sao obrigatorios.' });
    }

    const userRecord = await adminAuth.createUser({
      email: email.trim(),
      password: password.trim(),
      displayName: displayName.trim()
    });

    return res.status(200).json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error) {
    console.error('store-auth error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno.';
    return res.status(500).json({ error: message });
  }
}
