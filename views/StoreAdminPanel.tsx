import React, { useEffect, useMemo, useState } from 'react';
import { CampaignAction, RedeemRequest, Referral, Referrer, Store } from '../types';
import {
  createRedeemRequestForReferrer,
  getRedeemRequests,
  getReferralBalanceSummary,
  getReferrals,
  getReferrers,
  saveReferrer,
  saveStore,
  updateRedeemRequest,
  updateReferral
} from '../utils/storage';

interface StoreAdminPanelProps {
  store: Store;
  onLogout: () => void;
  onUpdateStore: (store: Store) => void;
}

type AdminTab = 'OVERVIEW' | 'REFERRALS' | 'REFERRERS' | 'REDEEMS' | 'SETTINGS';

const redeemLabel: Record<RedeemRequest['status'], string> = {
  REQUESTED: 'Solicitado',
  APPROVED: 'Aprovado',
  PAID: 'Pago',
  REJECTED: 'Recusado'
};

const redeemOptions: RedeemRequest['status'][] = ['REQUESTED', 'APPROVED', 'PAID', 'REJECTED'];
const benefitStatusLabel: Record<Referral['customerBenefitStatus'], string> = {
  AWAITING_REDEEM: 'Aguardando resgate',
  REDEEMED: 'Resgatado',
  CANCELED: 'Cancelado'
};

const benefitStatusTone: Record<Referral['customerBenefitStatus'], string> = {
  AWAITING_REDEEM: 'bg-amber-400/10 text-amber-300 border border-amber-400/20',
  REDEEMED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  CANCELED: 'bg-red-500/10 text-red-400 border border-red-500/20'
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyAction = (): CampaignAction => ({
  id: `action-${Math.random().toString(36).slice(2, 9)}`,
  label: '',
  url: '',
  type: 'CUSTOM',
  required: false,
  enabled: true
});

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="glass p-5 rounded-2xl border border-slate-800 border-l-4 border-l-cyan-400">
    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-1">{label}</p>
    <h3 className="text-2xl md:text-3xl font-black italic text-white">{value}</h3>
  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{children}</label>
);

const StoreAdminPanel: React.FC<StoreAdminPanelProps> = ({ store, onLogout, onUpdateStore }) => {
  const [tab, setTab] = useState<AdminTab>('OVERVIEW');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [redeems, setRedeems] = useState<RedeemRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Referral['customerBenefitStatus']>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [storeName, setStoreName] = useState(store.name);
  const [publicSlug, setPublicSlug] = useState(store.publicSlug);
  const [whatsapp, setWhatsapp] = useState(store.whatsappNumber);
  const [formTitle, setFormTitle] = useState(store.formTitle || '');
  const [formSubtitle, setFormSubtitle] = useState(store.formSubtitle || '');
  const [shareMessage, setShareMessage] = useState(store.shareMessage || '');
  const [indicatorRewardType, setIndicatorRewardType] = useState<Store['indicatorRewardType']>(store.indicatorRewardType ?? 'FIXED');
  const [indicatorRewardValue, setIndicatorRewardValue] = useState(String(store.indicatorRewardValue ?? 10));
  const [minRedeemAmount, setMinRedeemAmount] = useState(String(store.minRedeemAmount ?? 50));
  const [customerBenefitTitle, setCustomerBenefitTitle] = useState(store.customerBenefitTitle || '');
  const [customerBenefitDescription, setCustomerBenefitDescription] = useState(store.customerBenefitDescription || '');
  const [rewardMode, setRewardMode] = useState<Store['rewardMode']>(store.rewardMode ?? 'ON_SUBMISSION');
  const [campaignActions, setCampaignActions] = useState<CampaignAction[]>(store.campaignActions.length ? store.campaignActions : [emptyAction()]);
  const [newReferrerName, setNewReferrerName] = useState('');
  const [newReferrerPhone, setNewReferrerPhone] = useState('');
  const [purchaseValues, setPurchaseValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [loadedReferrals, loadedReferrers, loadedRedeems] = await Promise.all([
          getReferrals(store.id),
          getReferrers(store.id),
          getRedeemRequests(store.id)
        ]);
        setReferrals(loadedReferrals);
        setPurchaseValues(
          loadedReferrals.reduce<Record<string, string>>((acc, item) => {
            acc[item.id] = String(item.purchaseAmount ?? 0);
            return acc;
          }, {})
        );
        setReferrers(loadedReferrers);
        setRedeems(loadedRedeems);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [store.id]);

  const publicLink = useMemo(
    () => (typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}?loja=${publicSlug || store.publicSlug}`),
    [publicSlug, store.publicSlug]
  );

  const summary = useMemo(
    () => ({
      totalReferrals: referrals.length,
      todayReferrals: referrals.filter((item) => new Date(item.createdAt).toDateString() === new Date().toDateString()).length,
      activeReferrers: referrers.filter((item) => item.isActive).length,
      totalPending: redeems.filter((item) => item.status === 'REQUESTED' || item.status === 'APPROVED').reduce((sum, item) => sum + item.amount, 0),
      totalPaid: redeems.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0)
    }),
    [redeems, referrals, referrers]
  );

  const purchaseControlEnabled =
    store.indicatorRewardType === 'PERCENTAGE' || store.rewardMode === 'ON_PURCHASE';

  const getCalculatedReward = (purchaseAmount: number) =>
    store.indicatorRewardType === 'PERCENTAGE'
      ? (purchaseAmount * store.indicatorRewardValue) / 100
      : store.indicatorRewardValue;

  const referrerCards = useMemo(
    () =>
      referrers
        .map((referrer) => {
          const ownReferrals = referrals.filter((item) => item.referrerId === referrer.id);
          return {
            referrer,
            referralsCount: ownReferrals.length,
            approvedCount: ownReferrals.filter((item) => item.status === 'APPROVED' || item.status === 'CONVERTED').length,
            balance: getReferralBalanceSummary(store, referrer.id, referrals, redeems)
          };
        })
        .sort((a, b) => b.balance.totalEarned - a.balance.totalEarned),
    [redeems, referrals, referrers, store]
  );

  const filteredReferrals = useMemo(
    () =>
      referrals.filter((referral) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          referral.referredName.toLowerCase().includes(query) ||
          referral.referrerName.toLowerCase().includes(query) ||
          referral.referredPhone.includes(searchTerm) ||
          referral.referrerPhone.includes(searchTerm);
        const matchesStatus = statusFilter === 'ALL' || referral.customerBenefitStatus === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [referrals, searchTerm, statusFilter]
  );

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      alert('Link copiado com sucesso.');
    } catch {
      alert('Não foi possível copiar o link.');
    }
  };

  const openWhatsappShare = () => {
    const text = (shareMessage.trim() || `Participe da indicação premiada da ${storeName}: {LINK}`).replace('{LINK}', publicLink);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendBenefitConfirmation = async (referral: Referral) => {
    const firstConfirm = window.confirm(`Deseja enviar a confirmação para o número ${referral.referredPhone}?`);
    if (!firstConfirm) return;
    const secondConfirm = window.confirm('Confirma novamente o envio da mensagem para este número?');
    if (!secondConfirm) return;
    const message = `Olá, ${referral.referredName}! Seu benefício da loja ${store.name} está pronto para resgate. Responda esta mensagem ou apresente este número na loja para confirmar o resgate.`;
    const normalizedPhone = referral.referredPhone.replace(/\D/g, '');
    const whatsappPhone = normalizedPhone.startsWith('55') ? normalizedPhone : `55${normalizedPhone}`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const markBenefitAsRedeemed = async (referral: Referral) => {
    const firstConfirm = window.confirm(`Deseja marcar o benefício de ${referral.referredName} como resgatado?`);
    if (!firstConfirm) return;
    const secondConfirm = window.confirm('Confirma novamente que este benefício já foi resgatado?');
    if (!secondConfirm) return;
    const updated: Referral = { ...referral, customerBenefitStatus: 'REDEEMED', customerBenefitRedeemed: true, customerBenefitRedeemedAt: Date.now() };
    await updateReferral(updated);
    setReferrals((current) => current.map((item) => (item.id === referral.id ? updated : item)));
  };

  const savePurchaseAmount = async (referral: Referral) => {
    const rawValue = purchaseValues[referral.id] ?? '0';
    const normalizedValue = Number(rawValue.toString().replace(',', '.'));

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      alert('Informe um valor de compra válido.');
      return;
    }

    const updated: Referral = {
      ...referral,
      purchaseAmount: normalizedValue,
      rewardAmount: getCalculatedReward(normalizedValue),
      status: normalizedValue > 0 ? 'CONVERTED' : referral.status
    };

    await updateReferral(updated);
    setReferrals((current) => current.map((item) => (item.id === referral.id ? updated : item)));
    setPurchaseValues((current) => ({ ...current, [referral.id]: String(normalizedValue) }));
    alert('Valor da compra salvo com sucesso.');
  };

  const cancelReferral = async (referral: Referral) => {
    const firstConfirm = window.confirm(`Deseja cancelar o registro de ${referral.referredName}?`);
    if (!firstConfirm) return;
    const secondConfirm = window.confirm('Confirma novamente o cancelamento? O registro ficará no histórico.');
    if (!secondConfirm) return;
    const updated: Referral = { ...referral, customerBenefitStatus: 'CANCELED', customerBenefitRedeemed: false, customerBenefitRedeemedAt: undefined };
    await updateReferral(updated);
    setReferrals((current) => current.map((item) => (item.id === referral.id ? updated : item)));
  };

  const reopenReferral = async (referral: Referral) => {
    const confirmed = window.confirm(`Deseja corrigir o status de ${referral.referredName} e voltar para aguardando resgate?`);
    if (!confirmed) return;
    const updated: Referral = { ...referral, customerBenefitStatus: 'AWAITING_REDEEM', customerBenefitRedeemed: false, customerBenefitRedeemedAt: undefined };
    await updateReferral(updated);
    setReferrals((current) => current.map((item) => (item.id === referral.id ? updated : item)));
  };

  const changeRedeemStatus = async (redeem: RedeemRequest, status: RedeemRequest['status']) => {
    const updated = { ...redeem, status, processedAt: status === 'REQUESTED' ? undefined : Date.now() };
    await updateRedeemRequest(updated);
    setRedeems((current) => current.map((item) => (item.id === redeem.id ? updated : item)));
  };

  const createRedeem = async (referrer: Referrer) => {
    const balance = getReferralBalanceSummary(store, referrer.id, referrals, redeems);
    if (balance.availableBalance < store.minRedeemAmount) {
      alert('Esse indicador ainda não atingiu o mínimo para resgate.');
      return;
    }
    const request = await createRedeemRequestForReferrer(store, referrer, balance.availableBalance);
    setRedeems((current) => [request, ...current]);
    alert('Solicitação criada com sucesso.');
  };

  const createReferrer = async () => {
    const trimmedName = newReferrerName.trim();
    const trimmedPhone = newReferrerPhone.trim();
    if (!trimmedName || !trimmedPhone) {
      alert('Preencha o nome e o telefone do indicador.');
      return;
    }
    const normalizedPhone = trimmedPhone.replace(/\D/g, '');
    const duplicatedPhone = referrers.some((referrer) => referrer.phone.replace(/\D/g, '') === normalizedPhone);
    if (duplicatedPhone) {
      alert('Já existe um indicador cadastrado com esse telefone.');
      return;
    }
    const newReferrer: Referrer = { id: `ref-${Math.random().toString(36).slice(2, 10)}`, storeId: store.id, name: trimmedName, phone: trimmedPhone, createdAt: Date.now(), isActive: true };
    await saveReferrer(newReferrer);
    setReferrers((current) => [newReferrer, ...current]);
    setNewReferrerName('');
    setNewReferrerPhone('');
    alert('Indicador cadastrado com sucesso.');
  };

  const handleActionChange = (index: number, field: keyof CampaignAction, value: string | boolean) => {
    setCampaignActions((current) => current.map((action, i) => (i === index ? { ...action, [field]: value } : action)));
  };

  const downloadCSV = () => {
    if (!referrals.length) return alert('Nenhuma indicação para exportar.');
    const headers = ['Indicado', 'Telefone indicado', 'Indicador', 'Telefone indicador', 'Data', 'Status do benefício'];
    const rows = referrals.map((r) => [r.referredName, r.referredPhone, r.referrerName, r.referrerPhone, r.referralDate, benefitStatusLabel[r.customerBenefitStatus]]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `indicacoes_${store.name.replace(/\s/g, '_')}.csv`);
    link.click();
  };

  const saveSettings = async () => {
    if (!storeName.trim() || !publicSlug.trim()) return alert('Preencha pelo menos o nome da loja e o slug público.');
    try {
      setIsSaving(true);
      const updatedStore: Store = {
        ...store,
        name: storeName.trim(),
        publicSlug: publicSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        whatsappNumber: whatsapp.trim(),
        formTitle: formTitle.trim() || 'Programa de indicação premiada',
        formSubtitle: formSubtitle.trim(),
        shareMessage: shareMessage.trim(),
        indicatorRewardType,
        indicatorRewardValue: Number(indicatorRewardValue) || 0,
        minRedeemAmount: Number(minRedeemAmount) || 0,
        customerBenefitTitle: customerBenefitTitle.trim(),
        customerBenefitDescription: customerBenefitDescription.trim(),
        rewardMode: indicatorRewardType === 'PERCENTAGE' ? 'ON_PURCHASE' : rewardMode,
        campaignActions: campaignActions.filter((action) => action.label.trim() && action.url.trim())
      };
      await saveStore(updatedStore);
      onUpdateStore(updatedStore);
      alert('Configurações salvas com sucesso.');
      setTab('OVERVIEW');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-900 pb-6">
        <div>
          <h2 className="text-cyan-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-1">Painel da Loja</h2>
          <h1 className="text-2xl md:text-3xl font-black italic text-white uppercase">{storeName}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['OVERVIEW', 'REFERRALS', 'REFERRERS', 'REDEEMS', 'SETTINGS'] as AdminTab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`px-3 py-2 rounded-lg font-bold transition-all text-sm ${tab === item ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white border border-slate-800'}`}>
              {{ OVERVIEW: 'Visão Geral', REFERRALS: 'Indicações', REFERRERS: 'Indicadores', REDEEMS: 'Resgates', SETTINGS: 'Configurações' }[item]}
            </button>
          ))}
          <button onClick={onLogout} className="px-3 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all text-sm">Sair</button>
        </div>
      </header>

      {tab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard label="Indicadores Ativos" value={summary.activeReferrers} />
            <StatCard label="Indicações" value={summary.totalReferrals} />
            <StatCard label="Entraram Hoje" value={summary.todayReferrals} />
            <StatCard label="Saldo a Pagar" value={money.format(summary.totalPending)} />
            <StatCard label="Total Pago" value={money.format(summary.totalPaid)} />
          </div>
          <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 space-y-5">
              <div>
                <h2 className="text-xl font-black italic text-white uppercase">Link da Campanha</h2>
                <p className="text-slate-500 text-sm mt-2">Use esse link no QR code do chaveiro ou para compartilhar.</p>
              </div>
              {store.customerBenefitTitle && (
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">Benefício Atual</p>
                  <p className="text-white font-black text-xl">{store.customerBenefitTitle}</p>
                  {store.customerBenefitDescription && <p className="text-slate-400 text-sm mt-2">{store.customerBenefitDescription}</p>}
                </div>
              )}
              <div className="glass p-4 rounded-2xl border border-slate-800">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-2">Link Público</p>
                <p className="text-white break-all font-medium">{publicLink}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <button onClick={copyShareLink} className="w-full bg-cyan-400 text-slate-950 py-4 rounded-xl font-black italic uppercase tracking-widest">Copiar Link</button>
                <button onClick={openWhatsappShare} className="w-full bg-green-500 text-white py-4 rounded-xl font-black italic uppercase tracking-widest">Compartilhar</button>
              </div>
            </div>
            <div className="bg-slate-900/30 rounded-3xl border border-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-bold uppercase tracking-widest text-sm">Top Indicadores</h4>
                <span className="text-xs font-black text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">{referrerCards.length} PERFIS</span>
              </div>
              <div className="space-y-3">
                {referrerCards.slice(0, 5).map(({ referrer, referralsCount, balance }, index) => (
                  <div key={referrer.id} className="glass p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-bold">{index + 1}. {referrer.name}</p>
                        <p className="text-slate-500 text-sm">{referralsCount} indicações</p>
                      </div>
                      <p className="text-cyan-400 font-black">{money.format(balance.availableBalance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'REFERRALS' && (
        <div className="bg-slate-900/30 rounded-3xl border border-slate-900 overflow-hidden">
          <div className="p-6 border-b border-slate-900">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-sm">Gestão de Indicações</h4>
              <button onClick={downloadCSV} disabled={!referrals.length} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-50">Exportar</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${statusFilter === 'ALL' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}>Todas</button>
              <button onClick={() => setStatusFilter('AWAITING_REDEEM')} className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${statusFilter === 'AWAITING_REDEEM' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}>Aguardando resgate</button>
              <button onClick={() => setStatusFilter('REDEEMED')} className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${statusFilter === 'REDEEMED' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}>Resgatadas</button>
              <button onClick={() => setStatusFilter('CANCELED')} className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ${statusFilter === 'CANCELED' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}>Canceladas</button>
            </div>
            <input type="text" placeholder="Buscar por indicado, indicador ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-400" />
          </div>
          <div className="p-4 md:p-6 space-y-4">
            {isLoading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div> : filteredReferrals.length ? filteredReferrals.map((referral) => (
              <div key={referral.id} className={`glass p-4 md:p-6 rounded-2xl border ${referral.status === 'NEW' ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-slate-800'}`}>
                <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <h4 className="text-lg font-black italic text-white uppercase">{referral.referredName}</h4>
                      {referral.status === 'NEW' && <span className="text-[10px] bg-cyan-400 text-slate-950 px-2 py-1 rounded font-black uppercase">Nova</span>}
                    </div>
                    <p className="text-slate-400 text-sm">Indicado por <b>{referral.referrerName}</b> • {referral.referrerPhone}</p>
                    <p className="text-slate-500 text-sm">{referral.referredPhone} • {referral.referralDate}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <p className="text-slate-500 text-sm">Benefício do cliente:</p>
                      <span className={`text-[11px] px-2 py-1 rounded-full font-black uppercase tracking-wider ${benefitStatusTone[referral.customerBenefitStatus]}`}>
                        {benefitStatusLabel[referral.customerBenefitStatus]}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm">
                      Recompensa do indicador:{' '}
                      <span className="text-cyan-400 font-bold">
                        {money.format(referral.rewardAmount)}
                      </span>
                      {store.indicatorRewardType === 'PERCENTAGE' && (
                        <span className="text-slate-500"> ({store.indicatorRewardValue}% da compra)</span>
                      )}
                    </p>
                    {purchaseControlEnabled && (
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-end pt-1">
                        <div className="flex-1">
                          <label className="block text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
                            Valor da compra
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={purchaseValues[referral.id] ?? ''}
                            onChange={(e) => setPurchaseValues((current) => ({ ...current, [referral.id]: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                            placeholder="0,00"
                          />
                        </div>
                        <button onClick={() => savePurchaseAmount(referral)} className="px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest border text-amber-300 border-amber-400/30">
                          Salvar Compra
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <button onClick={() => sendBenefitConfirmation(referral)} className="px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest border text-cyan-300 border-cyan-400/30">Confirmar Número</button>
                    <button onClick={() => markBenefitAsRedeemed(referral)} className="px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest border text-green-400 border-green-500/30">Resgatar</button>
                    <button onClick={() => cancelReferral(referral)} className="px-4 py-3 text-red-500/70 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest">Cancelar</button>
                    {referral.customerBenefitStatus !== 'AWAITING_REDEEM' && <button onClick={() => reopenReferral(referral)} className="px-4 py-3 text-amber-300 border border-amber-400/20 rounded-lg text-xs font-bold uppercase tracking-widest">Corrigir Status</button>}
                  </div>
                </div>
              </div>
            )) : <div className="p-8 text-center text-slate-500 italic">Nenhuma indicação encontrada.</div>}
          </div>
        </div>
      )}

      {tab === 'REFERRERS' && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-slate-800">
            <h3 className="text-xl font-black italic text-white mb-4">Cadastrar Indicador</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={newReferrerName} onChange={(e) => setNewReferrerName(e.target.value)} placeholder="Nome do indicador" />
              <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={newReferrerPhone} onChange={(e) => setNewReferrerPhone(e.target.value)} placeholder="Telefone do indicador" />
              <button onClick={createReferrer} className="bg-cyan-400 text-slate-950 rounded-xl font-black italic uppercase tracking-widest px-4 py-3">Salvar Indicador</button>
            </div>
            <p className="text-slate-500 text-sm mt-4">Depois, no formulário público, o cliente poderá buscar esse nome e selecionar o indicador correto.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {referrerCards.map(({ referrer, referralsCount, approvedCount, balance }) => (
              <div key={referrer.id} className="glass p-6 rounded-3xl border border-slate-800">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-black italic text-white">{referrer.name}</h3>
                    <p className="text-slate-500 text-sm">{referrer.phone}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${referrer.isActive ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-300'}`}>{referrer.isActive ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <StatCard label="Indicações" value={referralsCount} />
                  <StatCard label="Aprovadas" value={approvedCount} />
                  <StatCard label="Disponível" value={money.format(balance.availableBalance)} />
                  <StatCard label="Pago" value={money.format(balance.totalPaid)} />
                </div>
                <button onClick={() => createRedeem(referrer)} className="w-full py-4 bg-cyan-400 text-slate-950 rounded-xl font-black italic uppercase tracking-widest">Solicitar Resgate</button>
              </div>
            ))}
            {!referrerCards.length && <div className="col-span-full p-12 text-center text-slate-500 italic bg-slate-900/30 rounded-3xl border border-slate-900">Nenhum indicador criado ainda.</div>}
          </div>
        </div>
      )}

      {tab === 'REDEEMS' && (
        <div className="bg-slate-900/30 rounded-3xl border border-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Resgates e Pagamentos</h4>
            <span className="text-xs font-black text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">{redeems.length} SOLICITAÇÕES</span>
          </div>
          {redeems.length ? redeems.map((redeem) => (
            <div key={redeem.id} className="glass p-4 md:p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h4 className="text-lg font-black italic text-white">{redeem.referrerName}</h4>
                  <p className="text-slate-500 text-sm">Solicitado em {new Date(redeem.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <p className="text-cyan-400 font-black text-lg">{money.format(redeem.amount)}</p>
                  <select value={redeem.status} onChange={(e) => changeRedeemStatus(redeem, e.target.value as RedeemRequest['status'])} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-sm text-white">
                    {redeemOptions.map((status) => <option key={status} value={status}>{redeemLabel[status]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )) : <div className="py-12 text-center text-slate-500 italic">Nenhum resgate solicitado ainda.</div>}
        </div>
      )}

      {tab === 'SETTINGS' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="glass p-8 rounded-3xl border border-slate-800 space-y-6">
            <h3 className="text-xl font-black italic text-white uppercase">Configurar Loja</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Nome da Loja</FieldLabel>
                <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Nome da loja" />
              </div>
              <div>
                <FieldLabel>Slug Público</FieldLabel>
                <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={publicSlug} onChange={(e) => setPublicSlug(e.target.value)} placeholder="slug-da-loja" />
              </div>
              <div>
                <FieldLabel>WhatsApp da Loja</FieldLabel>
                <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5511999999999" />
              </div>
              <div>
                <FieldLabel>Mínimo para Resgate</FieldLabel>
                <input type="number" min="0" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={minRedeemAmount} onChange={(e) => setMinRedeemAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <FieldLabel>Título do Formulário</FieldLabel>
                <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Programa de indicação premiada" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
              <div>
                <h4 className="text-white font-bold uppercase tracking-widest text-sm">Benefício de Quem Está Sendo Indicado</h4>
                <p className="text-slate-500 text-sm mt-1">Esse é o benefício que aparece para o cliente no formulário e na tela final.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Título do Benefício do Cliente</FieldLabel>
                  <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={customerBenefitTitle} onChange={(e) => setCustomerBenefitTitle(e.target.value)} placeholder="Ex: 10% OFF" />
                </div>
                <div>
                  <FieldLabel>Descrição do Benefício do Cliente</FieldLabel>
                  <textarea rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={customerBenefitDescription} onChange={(e) => setCustomerBenefitDescription(e.target.value)} placeholder="Explique como o cliente resgata o benefício" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
              <div>
                <h4 className="text-white font-bold uppercase tracking-widest text-sm">Recompensa de Quem Indicou</h4>
                <p className="text-slate-500 text-sm mt-1">Defina como o indicador será remunerado por cada indicação válida.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Tipo de Recompensa do Indicador</FieldLabel>
                  <select value={indicatorRewardType} onChange={(e) => setIndicatorRewardType(e.target.value as Store['indicatorRewardType'])} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white">
                    <option value="FIXED">Valor fixo por indicação</option>
                    <option value="PERCENTAGE">Porcentagem da compra da indicação</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>{indicatorRewardType === 'PERCENTAGE' ? 'Porcentagem da Compra (%)' : 'Valor Fixo por Indicação'}</FieldLabel>
                  <input type="number" min="0" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={indicatorRewardValue} onChange={(e) => setIndicatorRewardValue(e.target.value)} placeholder={indicatorRewardType === 'PERCENTAGE' ? 'Ex: 10' : '0,00'} />
                </div>
              </div>
              {indicatorRewardType === 'FIXED' ? (
                <div>
                  <FieldLabel>Quando o Indicador Ganha</FieldLabel>
                  <select value={rewardMode} onChange={(e) => setRewardMode(e.target.value as Store['rewardMode'])} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white">
                    <option value="ON_SUBMISSION">Indicador ganha no cadastro</option>
                    <option value="ON_PURCHASE">Indicador ganha só após compra</option>
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
                  Quando a recompensa é por porcentagem, o indicador passa a ganhar automaticamente após você informar o valor da compra em cada indicação.
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Subtítulo do Formulário</FieldLabel>
              <input className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={formSubtitle} onChange={(e) => setFormSubtitle(e.target.value)} placeholder="Texto de apoio do formulário" />
            </div>
            <div>
              <FieldLabel>Mensagem de Compartilhamento</FieldLabel>
              <textarea rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} placeholder="Mensagem usada para compartilhar o link da campanha" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold uppercase tracking-widest text-sm">Regras da Campanha</h4>
                  <p className="text-slate-500 text-sm mt-1">Botões opcionais ou obrigatórios antes da finalização.</p>
                </div>
                <button onClick={() => setCampaignActions((current) => [...current, emptyAction()])} className="px-4 py-2 bg-cyan-400 text-slate-950 rounded-xl font-black italic uppercase tracking-widest text-xs">+ Adicionar</button>
              </div>
              {campaignActions.map((action, index) => (
                <div key={action.id} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input placeholder="Texto do botão" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={action.label} onChange={(e) => handleActionChange(index, 'label', e.target.value)} />
                    <input placeholder="Link da ação" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" value={action.url} onChange={(e) => handleActionChange(index, 'url', e.target.value)} />
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 items-center">
                    <select value={action.type} onChange={(e) => handleActionChange(index, 'type', e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
                      <option value="GOOGLE_REVIEW">Google</option>
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="CUSTOM">Personalizado</option>
                    </select>
                    <label className="flex items-center gap-2 text-slate-300 text-sm"><input type="checkbox" className="accent-cyan-400" checked={action.required} onChange={(e) => handleActionChange(index, 'required', e.target.checked)} />Obrigatória</label>
                    <label className="flex items-center gap-2 text-slate-300 text-sm"><input type="checkbox" className="accent-cyan-400" checked={action.enabled} onChange={(e) => handleActionChange(index, 'enabled', e.target.checked)} />Ativa</label>
                    <button onClick={() => setCampaignActions((current) => current.filter((_, i) => i !== index))} className="px-4 py-2 text-red-500/70 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest">Remover</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 flex gap-4">
              <button onClick={() => setTab('OVERVIEW')} className="flex-1 py-4 text-slate-500 font-bold uppercase tracking-widest text-sm">Cancelar</button>
              <button onClick={saveSettings} disabled={isSaving} className="flex-[2] py-4 bg-cyan-400 text-slate-950 rounded-xl font-black italic uppercase tracking-widest disabled:opacity-50">{isSaving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreAdminPanel;
