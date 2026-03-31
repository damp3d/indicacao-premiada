import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isLocalDataMode } from '../firebase';
import { Store } from '../types';
import { getStoreByEmail, getStores } from '../utils/storage';

const canUseDevelopmentStoreAuth =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const getAuthErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return 'Erro ao autenticar. Tente novamente.';
  }

  const code = String((error as { code?: string }).code);

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return 'Email ou senha incorretos.';
    case 'auth/user-not-found':
      return 'Esse usuário não existe no Firebase Authentication.';
    case 'auth/invalid-email':
      return 'O email informado é inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de login. Aguarde um pouco e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de conexão ao tentar autenticar.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'O login por email e senha ainda não foi ativado no Firebase.';
    default:
      return `Erro ao autenticar: ${code}`;
  }
};

interface AdminLoginProps {
  onSuperAdminLogin: () => void;
  onStoreLogin: (store: Store) => void;
  systemLogo?: string | null;
}

const AdminLogin: React.FC<AdminLoginProps> = ({
  onSuperAdminLogin,
  onStoreLogin,
  systemLogo
}) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      const normalizedLogin = login.trim().toLowerCase();

      if (!normalizedLogin.includes('@')) {
        setError('Use o email cadastrado da loja ou do administrador.');
        return;
      }

      if (!auth || isLocalDataMode) {
        if (normalizedLogin === 'admin@damp3d.com' && password === 'admin123') {
          onSuperAdminLogin();
          return;
        }

        const stores = await getStores();
        const foundStore = stores.find(
          (store) =>
            store.email?.toLowerCase() === normalizedLogin &&
            store.passwordHash === password
        );

        if (foundStore) {
          onStoreLogin(foundStore);
          return;
        }

        setError('Credenciais invalidas.');
        return;
      }

      try {
        const credential = await signInWithEmailAndPassword(auth, normalizedLogin, password);

        if (credential.user.email?.toLowerCase() === 'admin@damp3d.com') {
          onSuperAdminLogin();
          return;
        }

        const storeByEmail = await getStoreByEmail(normalizedLogin);
        if (storeByEmail) {
          onStoreLogin(storeByEmail);
          return;
        }

        setError('Este usuario nao esta vinculado a uma loja cadastrada.');
      } catch (firebaseError) {
        if (canUseDevelopmentStoreAuth) {
          const stores = await getStores();
          const foundStore = stores.find(
            (store) =>
              store.email?.toLowerCase() === normalizedLogin &&
              store.passwordHash === password
          );

          if (foundStore) {
            onStoreLogin(foundStore);
            return;
          }
        }

        throw firebaseError;
      }
    } catch (error) {
      console.error('Erro de login:', error);
      setError(getAuthErrorMessage(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-md glass p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-800 space-y-6 md:space-y-8">
        <div className="text-center">
          <h2 className="text-sm font-black text-cyan-400 uppercase tracking-[0.3em] mb-4">Acesso Restrito</h2>
          <div className="mb-4">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="h-10 mx-auto object-contain" />
            ) : (
              <div className="flex flex-col leading-tight items-center">
                <h1 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tight">
                  INDICAÇÃO
                </h1>
                <h1 className="text-3xl sm:text-4xl font-black italic text-[#2563eb] uppercase tracking-tight mt-[-4px]">
                  PREMIADA
                </h1>
              </div>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            Entre com seu login e senha para acessar o painel.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <input
                required
                type="text"
                placeholder="Email"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                required
                type="password"
                placeholder="Senha"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-center font-bold text-sm animate-bounce">{error}</p>}

          <button
            type="submit"
            disabled={isLoggingIn}
            className={`w-full py-4 bg-cyan-400 text-slate-950 rounded-xl font-black italic uppercase tracking-widest shadow-lg shadow-cyan-400/20 transition-all ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
          >
            {isLoggingIn ? 'ENTRANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
