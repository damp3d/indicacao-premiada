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

    const { uid, email, password, displayName } = getJsonBody(req);

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, senha e nome sao obrigatorios.' });
    }

    const adminAuth = getAdminAuth();
    let userRecord;

    if (uid) {
      userRecord = await adminAuth.updateUser(uid, {
        email,
        password,
        displayName
      });
    } else {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName
      });
    }

    return res.status(200).json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error) {
    console.error('store-auth error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno.' });
  }
};
