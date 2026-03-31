import { auth } from '../firebase';

type StoreAuthPayload = {
  email?: string;
  password?: string;
  displayName?: string;
  uid?: string;
};

type AdminApiResponse = {
  error?: string;
  uid?: string;
  email?: string;
};

const mapAdminError = (message?: string) => {
  switch (message) {
    case 'auth/email-already-exists':
      return 'Este email ja esta em uso por outra conta.';
    case 'auth/invalid-email':
      return 'O email informado e invalido.';
    case 'auth/invalid-password':
    case 'auth/password-does-not-meet-requirements':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/user-not-found':
      return 'Nao existe conta vinculada para esta loja.';
    case 'Token de autenticacao ausente.':
      return 'Sua sessao de administrador expirou. Entre novamente.';
    case 'Usuario sem permissao de administrador.':
      return 'Somente o administrador pode alterar credenciais das lojas.';
    default:
      return message || 'Erro ao comunicar com o servidor.';
  }
};

const getAdminHeaders = async () => {
  if (!auth?.currentUser) {
    throw new Error('Sua sessao de administrador expirou. Entre novamente.');
  }

  const idToken = await auth.currentUser.getIdToken();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`
  };
};

const parseAdminResponse = async (response: Response) => {
  if (response.status === 404) {
    throw new Error('A API administrativa não está disponível nesse ambiente. Para criar lojas localmente, rode com `vercel dev` ou faça o teste já na Vercel.');
  }

  const rawBody = await response.text();
  let data: AdminApiResponse = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as AdminApiResponse;
    } catch {
      if (!response.ok) {
        throw new Error(rawBody.includes('A server error has occurred') ? 'O servidor falhou ao processar a requisicao. Verifique o deploy das funcoes e tente novamente.' : rawBody);
      }
    }
  }

  if (!response.ok) {
    throw new Error(mapAdminError(data.error));
  }

  return data;
};

export const upsertStoreAuthUser = async (payload: StoreAuthPayload) => {
  const response = await fetch('/api/store-auth', {
    method: 'POST',
    headers: await getAdminHeaders(),
    body: JSON.stringify(payload)
  });

  return parseAdminResponse(response);
};
