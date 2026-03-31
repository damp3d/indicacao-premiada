import React, { useEffect, useState } from 'react';
import { Store } from '../types';
import { getStores } from '../utils/storage';

interface HomeProps {
  onSelectStore: (store: Store) => void;
  systemLogo?: string | null;
}

const Home: React.FC<HomeProps> = ({ onSelectStore, systemLogo }) => {
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      const data = await getStores();
      setStores(data);
      setLoading(false);
    };

    fetchStores();
  }, []);

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 py-8">
      <div className="text-center mb-8 md:mb-12 flex flex-col items-center">
        <div className="text-4xl md:text-5xl mb-4 md:mb-6">🔎</div>
        <div className="flex flex-col leading-tight">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black italic text-white uppercase tracking-tight">
            O QUE VOCÊ
          </h1>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black italic text-[#2563eb] uppercase tracking-tight mt-[-5px]">
            PROCURA
          </h1>
        </div>
        <p className="mt-5 max-w-xl text-slate-400 font-medium text-sm md:text-base">
          A loja compartilha o link dela, o cliente preenche o formulário e tudo chega organizado
          para gestão e acompanhamento.
        </p>
        <div className="mt-4 md:mt-6">
          {systemLogo ? (
            <img src={systemLogo} alt="Platform Logo" className="h-5 md:h-6 object-contain opacity-80" />
          ) : (
            <p className="text-slate-500 font-bold tracking-[0.3em] text-xs uppercase opacity-80">
              DAMP3D
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-xl px-2">
        <div className="bg-[#0a0f1e] border border-cyan-900/30 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 md:left-5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full bg-[#020617] border border-slate-800 rounded-xl md:rounded-2xl py-4 md:py-5 pl-12 md:pl-14 pr-4 md:pr-6 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition-all duration-300 text-base md:text-lg"
              placeholder="Digite o nome da loja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {search.length > 0 && (
          <div className="mt-6 md:mt-8 grid gap-3 md:gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredStores.length > 0 ? (
              filteredStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => onSelectStore(store)}
                  className="glass p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-between hover:border-cyan-400 transition-all group active:scale-95"
                >
                  <div className="text-left">
                    <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {store.name}
                    </h3>
                    <p className="text-slate-400 text-xs md:text-sm">
                      Abrir formulário público da loja
                    </p>
                  </div>
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8 italic">Nenhuma loja encontrada.</p>
            )}
          </div>
        )}
      </div>

      {!search && (
        <div className="mt-16 flex flex-col items-center opacity-20">
          <div className="w-1 h-12 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default Home;
