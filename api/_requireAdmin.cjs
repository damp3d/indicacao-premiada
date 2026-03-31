const { getAdminAuth } = require('./_firebaseAdmin.cjs');

const requireAdmin = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Token de autenticacao ausente.');
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  const decodedToken = await getAdminAuth().verifyIdToken(idToken);

  if (decodedToken.email !== 'admin@damp3d.com') {
    throw new Error('Usuario sem permissao de administrador.');
  }

  return decodedToken;
};

module.exports = {
  requireAdmin
};
