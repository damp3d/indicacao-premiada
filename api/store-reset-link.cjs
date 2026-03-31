const { getAdminAuth } = require('./_firebaseAdmin.cjs');
const { requireAdmin } = require('./_requireAdmin.cjs');

const getJsonBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }
  return req.body;
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  try {
    await requireAdmin(req);

    const { email } = getJsonBody(req);

    if (!email) {
      return res.status(400).json({ error: 'Email da loja e obrigatorio.' });
    }

    const link = await getAdminAuth().generatePasswordResetLink(email);
    return res.status(200).json({ link });
  } catch (error) {
    console.error('store-reset-link error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
};
