import React, { useEffect, useMemo, useState } from 'react';
import { isLocalDataMode } from '../firebase';
import { Store } from '../types';
import { upsertStoreAuthUser } from '../utils/adminApi';
import { deleteStore, getSystemConfig, getStores, saveStore, saveSystemConfig } from '../utils/storage';

interface SuperAdminPanelProps {
  onLogout: () => void;
  onLogoChange: () => void;
}

type ModalMode = 'create' | 'edit';
type StoreForm = {
  id: string;
  name: string;
  email: string;
  password: string;
  startDate: string;
  expiryDate: string;
  publicSlug: string;
  whatsappNumber: string;
  authUid: string;
  indicatorRewardValue: string;
  minRedeemAmount: string;
  active: boolean;
};

const emptyForm: StoreForm = {
  id: '',
  name: '',
  email: '',
  password: '',
  startDate: '',
  expiryDate: '',
  publicSlug: '',
  whatsappNumber: '5500000000000',
  authUid: '',
  indicatorRewardValue: '10',
  minRedeemAmount: '50',
  active: true
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const canUseDevelopmentStoreAuth =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ onLogout, onLogoChange }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingPasswordStoreId, setUpdatingPasswordStoreId] = useState<string | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [loadedStores, config] = await Promise.all([getStores(), getSystemConfig()]);
      setStores(loadedStores);
      setSystemLogo(config.logoUrl);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredStores = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.publicSlug.toLowerCase().includes(query) ||
        store.email?.toLowerCase().includes(query)
    );
  }, [searchTerm, stores]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setSystemLogo(base64String);
      await saveSystemConfig({ logoUrl: base64String });
      onLogoChange();
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof StoreForm, value: string | boolean) => {
    setForm((current) => {
      if (field === 'name' && typeof value === 'string') {
        return { ...current, name: value, publicSlug: slugify(value) };
      }
      return { ...current, [field]: value };
    });
  };

  const openCreateModal = () => {
    setModalMode('create');
    setForm({
      ...emptyForm,
      id: Math.random().toString(36).slice(2, 11),
      startDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (store: Store) => {
    setModalMode('edit');
    setForm({
      id: store.id,
      name: store.name,
      email: store.email || '',
      password: '',
      startDate: store.startDate || '',
      expiryDate: store.expiryDate || '',
      publicSlug: store.publicSlug,
      whatsappNumber: store.whatsappNumber,
      authUid: store.authUid || '',
      indicatorRewardValue: String(store.indicatorRewardValue ?? 10),
      minRedeemAmount: String(store.minRedeemAmount ?? 50),
      active: store.active !== false
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPassword = form.password.trim();

    if (!trimmedName || !form.publicSlug || !trimmedEmail) {
      return alert('Preencha o nome da loja e o e-mail de acesso.');
    }
    if (modalMode === 'create' && !trimmedPassword) {
      return alert('Informe uma senha inicial.');
    }
    if (modalMode === 'create' && trimmedPassword.length < 6) {
      return alert('A senha inicial precisa ter pelo menos 6 caracteres.');
    }

    try {
      setIsSaving(true);
      let authUid = form.authUid;
      let passwordHash = '';

      if (isLocalDataMode) {
        passwordHash = trimmedPassword || stores.find((store) => store.id === form.id)?.passwordHash || '';
      } else {
        try {
          const authResult = await upsertStoreAuthUser({
            uid: form.authUid || undefined,
            email: trimmedEmail,
            password: trimmedPassword || undefined,
            displayName: trimmedName
          });
          authUid = authResult.uid;
        } catch (error) {
          if (!canUseDevelopmentStoreAuth) {
            throw error;
          }

          passwordHash =
            trimmedPassword ||
            stores.find((store) => store.id === form.id)?.passwordHash ||
            '';
        }
      }

      const storeToSave: Store = {
        id: form.id || Math.random().toString(36).slice(2, 11),
        name: trimmedName,
        email: trimmedEmail,
        authUid,
        passwordHash,
        startDate: form.startDate || '',
        expiryDate: form.expiryDate || '',
        publicSlug: form.publicSlug.trim(),
        whatsappNumber: form.whatsappNumber.trim() || '5500000000000',
        formTitle: 'Programa de indicação premiada',
        formSubtitle: 'Preencha os dados abaixo para registrar a indicação e acumular recompensas.',
        shareMessage: 'Participe da campanha da loja: {LINK}',
        indicatorRewardType: modalMode === 'edit' ? stores.find((item) => item.id === form.id)?.indicatorRewardType || 'FIXED' : 'FIXED',
        indicatorRewardValue: Number(form.indicatorRewardValue) || 0,
        minRedeemAmount: Number(form.minRedeemAmount) || 0,
        customerBenefitTitle: '',
        customerBenefitDescription: '',
        rewardMode: 'ON_PURCHASE',
        active: form.active,
        campaignActions:
          modalMode === 'edit' ? stores.find((item) => item.id === form.id)?.campaignActions || [] : []
      };

      await saveStore(storeToSave);
      await loadAll();
      setShowModal(false);
      setForm(emptyForm);
      alert(modalMode === 'create' ? 'Loja criada com sucesso.' : 'Loja atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar loja:', error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar loja.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir esta loja?')) return;
    await deleteStore(id);
    await loadAll();
  };

  const handleResetPassword = async (store: Store) => {
    const newPassword = window.prompt(`Digite a nova senha da loja ${store.name}:`, '');
    if (newPassword === null) return;

    const trimmedPassword = newPassword.trim();
    if (!trimmedPassword) return alert('Informe uma senha para continuar.');
    if (trimmedPassword.length < 4) return alert('A senha precisa ter pelo menos 4 caracteres.');

    try {
      setUpdatingPasswordStoreId(store.id);

      if (isLocalDataMode) {
        await saveStore({ ...store, passwordHash: trimmedPassword });
        await loadAll();
        alert('Senha atualizada com sucesso.');
        return;
      }

      if (!store.email || !store.authUid) {
        return alert('Esta loja ainda não tem uma conta configurada.');
      }

      try {
        await upsertStoreAuthUser({
          uid: store.authUid,
          email: store.email,
          password: trimmedPassword,
          displayName: store.name
        });
      } catch (error) {
        if (!canUseDevelopmentStoreAuth) {
          throw error;
        }

        await saveStore({ ...store, passwordHash: trimmedPassword });
      }

      alert('Senha atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      alert(error instanceof Error ? error.message : 'Erro ao redefinir senha.');
    } finally {
      setUpdatingPasswordStoreId(null);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-900 pb-8">
        <div className="flex items-center gap-4">
          {systemLogo && <img src={systemLogo} alt="Logo" className="h-10 object-contain" />}
          <div>
            <h2 className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-1">Mestre do Sistema</h2>
            <h1 className="text-3xl font-black italic text-white uppercase">SUPER ADMIN</h1>
          </div>
        </div>
        <button onClick={onLogout} className="px-6 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">Sair</button>
      </header>

      <div className="mb-10 glass p-8 rounded-3xl border border-slate-800">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Identidade Visual da Plataforma</h3>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
            {systemLogo ? <img src={systemLogo} alt="Pré-visualização" className="w-full h-full object-contain p-2" /> : <span className="text-slate-700 text-xs font-bold uppercase">Sem logo</span>}
          </div>
          <div className="flex-1 space-y-4">
            <p className="text-slate-400 text-sm">Personalize o logo, a marca d'água e o rodapé da plataforma.</p>
            <label className="inline-block px-8 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold cursor-pointer hover:bg-slate-800 transition-all">
              {systemLogo ? 'ALTERAR LOGO' : 'ENVIAR LOGO'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
            {systemLogo && (
              <button
                onClick={async () => {
                  setSystemLogo(null);
                  await saveSystemConfig({ logoUrl: null });
                  onLogoChange();
                }}
                className="ml-4 text-red-500/50 hover:text-red-500 text-xs font-bold uppercase"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Gestão de Lojas ({stores.length})</h3>
          <p className="text-slate-500 text-sm mt-1">Crie, edite, ative, desative e organize as lojas do sistema.</p>
        </div>
        <button onClick={openCreateModal} className="bg-cyan-400 text-slate-950 px-6 py-3 rounded-xl font-black italic uppercase tracking-widest">+ NOVA LOJA</button>
      </div>

      <div className="mb-6">
        <input type="text" placeholder="Buscar por loja, e-mail ou slug..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <div key={store.id} className="glass p-6 rounded-2xl border border-slate-800 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-xl font-black italic text-white uppercase">{store.name}</h4>
                  <p className="text-slate-500 text-sm mt-1">{store.publicSlug}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${store.active ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-300'}`}>{store.active ? 'Ativa' : 'Inativa'}</span>
              </div>
              <div className="text-sm space-y-2 mb-6">
                <p className="text-slate-500 font-bold">E-mail: <span className="text-white font-normal break-all">{store.email || '-'}</span></p>
                <p className="text-slate-500 font-bold">WhatsApp: <span className="text-white font-normal">{store.whatsappNumber || '-'}</span></p>
                <p className="text-slate-500 font-bold">Slug: <span className="text-white font-normal">{store.publicSlug}</span></p>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-900 grid grid-cols-3 gap-2">
                <button onClick={() => openEditModal(store)} className="px-3 py-2 text-slate-300 text-xs font-bold uppercase tracking-widest border border-slate-800 rounded-lg">Editar</button>
                <button onClick={() => handleResetPassword(store)} className="px-3 py-2 text-cyan-400 text-xs font-bold uppercase tracking-widest border border-cyan-400/30 rounded-lg">{updatingPasswordStoreId === store.id ? 'Salvando' : 'Nova Senha'}</button>
                <button onClick={() => handleDelete(store.id)} className="px-3 py-2 text-red-500/70 text-xs font-bold uppercase tracking-widest border border-red-500/20 rounded-lg">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-2xl p-8 rounded-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black italic text-white mb-8 uppercase">{modalMode === 'create' ? 'CADASTRAR LOJA' : 'EDITAR LOJA'}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input placeholder="Nome da Loja" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
              <input placeholder="E-mail de acesso" className={`w-full bg-slate-900 border border-slate-800 rounded-xl p-4 ${modalMode === 'edit' ? 'text-slate-400 cursor-not-allowed' : 'text-white'}`} value={form.email} onChange={(e) => handleChange('email', e.target.value)} readOnly={modalMode === 'edit'} />
              {modalMode === 'create' ? (
                <input type="text" placeholder="Senha inicial" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
              ) : (
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 flex items-center">Para trocar a senha, use o botão Nova Senha no card da loja.</div>
              )}
              <input placeholder="Slug público" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400 cursor-not-allowed" value={form.publicSlug} readOnly />
              <input placeholder="WhatsApp da Loja" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.whatsappNumber} onChange={(e) => handleChange('whatsappNumber', e.target.value)} />
              <input placeholder="Valor fixo inicial por indicação" type="number" min="0" step="0.01" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.indicatorRewardValue} onChange={(e) => handleChange('indicatorRewardValue', e.target.value)} />
              <input placeholder="Mínimo para resgate" type="number" min="0" step="0.01" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.minRedeemAmount} onChange={(e) => handleChange('minRedeemAmount', e.target.value)} />
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Data de início</label>
                <input type="date" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Validade</label>
                <input type="date" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={form.expiryDate} onChange={(e) => handleChange('expiryDate', e.target.value)} />
              </div>
              <label className="flex items-center gap-3 text-slate-300 text-sm">
                <input type="checkbox" className="accent-cyan-400" checked={form.active} onChange={(e) => handleChange('active', e.target.checked)} />
                Loja ativa
              </label>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button onClick={() => setShowModal(false)} className="py-4 text-slate-500 font-bold uppercase tracking-widest text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="py-4 bg-cyan-400 text-slate-950 rounded-xl font-black italic uppercase tracking-widest disabled:opacity-50">{isSaving ? 'SALVANDO...' : 'SALVAR LOJA'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;
