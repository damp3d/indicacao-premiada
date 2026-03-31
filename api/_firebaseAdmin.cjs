const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const normalizePrivateKey = (value) => {
  if (!value) return '';

  const trimmedValue = value.trim();
  const withoutWrappingQuotes =
    trimmedValue.startsWith('"') && trimmedValue.endsWith('"')
      ? trimmedValue.slice(1, -1)
      : trimmedValue;

  return withoutWrappingQuotes
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
};

const getAdminApp = () => {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'As variaveis FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY precisam estar configuradas no Vercel.'
    );
  }

  return (
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    })
  );
};

const getAdminAuth = () => getAuth(getAdminApp());

module.exports = {
  getAdminAuth
};
