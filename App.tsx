import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isLocalDataMode } from './firebase';
import { Store, ViewState } from './types';
import { getStoreBySlug, getSystemConfig } from './utils/storage';
import AdminLogin from './views/AdminLogin';
import StoreAdminPanel from './views/StoreAdminPanel';
import StoreFront from './views/StoreFront';
import SuperAdminPanel from './views/SuperAdminPanel';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('ADMIN_LOGIN');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loggedStore, setLoggedStore] = useState<Store | null>(null);
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      const config = await getSystemConfig();
      setSystemLogo(config.logoUrl);

      const params = new URLSearchParams(window.location.search);
      const storeSlug = params.get('loja');

      if (storeSlug) {
        const store = await getStoreBySlug(storeSlug);
        if (store) {
          setSelectedStore(store);
          setView('STORE_PAGE');
        } else {
          setView('ADMIN_LOGIN');
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (!auth || isLocalDataMode) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdminAuthenticated(user?.email === 'admin@damp3d.com');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.title =
      view === 'STORE_PAGE' && selectedStore
        ? `${selectedStore.name} | INDICAÇÃO PREMIADA`
        : 'INDICAÇÃO PREMIADA';
  }, [selectedStore, view]);

  const refreshConfig = async () => {
    const config = await getSystemConfig();
    setSystemLogo(config.logoUrl);
  };

  const navigateTo = (newView: ViewState, storeData?: Store) => {
    if (storeData) {
      if (newView === 'STORE_PAGE') {
        setSelectedStore(storeData);
        const url = new URL(window.location.href);
        url.searchParams.set('loja', storeData.publicSlug);
        window.history.replaceState({}, '', url.toString());
      }

      if (newView === 'STORE_ADMIN') {
        setLoggedStore(storeData);
      }
    }

    if (newView === 'HOME' || newView === 'ADMIN_LOGIN' || newView === 'SUPER_ADMIN') {
      const url = new URL(window.location.href);
      url.searchParams.delete('loja');
      window.history.replaceState({}, '', url.toString());
    }

    setView(newView);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-all duration-300 relative overflow-hidden">
      {systemLogo && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0 overflow-hidden">
          <img
            src={systemLogo}
            alt="Marca d'água"
            className="w-[80%] max-w-4xl grayscale filter blur-[2px]"
          />
        </div>
      )}

      <button
        onClick={() => navigateTo('ADMIN_LOGIN')}
        className="fixed top-4 right-4 w-10 h-10 opacity-5 hover:opacity-100 transition-opacity z-50 text-slate-400 flex items-center justify-center rounded-full hover:bg-slate-800"
        title="Administração"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>

      <div className="relative z-10 flex-1 flex flex-col">
        {view === 'STORE_PAGE' && selectedStore && (
          <StoreFront store={selectedStore} onBack={() => navigateTo('ADMIN_LOGIN')} />
        )}

        {view === 'ADMIN_LOGIN' && (
          <AdminLogin
            onSuperAdminLogin={() => navigateTo('SUPER_ADMIN')}
            onStoreLogin={(store) => navigateTo('STORE_ADMIN', store)}
            systemLogo={systemLogo}
          />
        )}

        {view === 'SUPER_ADMIN' && (
          <SuperAdminPanel
            onLogout={async () => {
              if (auth && isAdminAuthenticated) {
                await signOut(auth);
              }
              navigateTo('ADMIN_LOGIN');
            }}
            onLogoChange={refreshConfig}
          />
        )}

        {view === 'STORE_ADMIN' && loggedStore && (
          <StoreAdminPanel
            store={loggedStore}
            onLogout={async () => {
              if (auth) {
                await signOut(auth);
              }
              navigateTo('ADMIN_LOGIN');
            }}
            onUpdateStore={(store) => setLoggedStore(store)}
          />
        )}
      </div>

      <footer className="relative z-10 mt-auto px-4 py-8 text-center">
        <div className="inline-flex max-w-full items-center justify-center rounded-full bg-white px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:px-6">
          <p className="whitespace-nowrap text-[10px] font-medium text-slate-950 sm:text-xs md:text-sm">
            Copyright © 2026 DAMP3D. Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
