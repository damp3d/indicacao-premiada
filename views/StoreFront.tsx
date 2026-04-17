import React, { useEffect, useMemo, useState } from 'react';
import { CampaignAction, Referrer, Store } from '../types';
import { getReferrers, submitReferral } from '../utils/storage';

interface StoreFrontProps {
  store: Store;
  onBack: () => void;
}

const formatTypeLabel = (type: CampaignAction['type']) => {
  switch (type) {
    case 'GOOGLE_REVIEW':
      return 'Google';
    case 'INSTAGRAM':
      return 'Instagram';
    case 'WHATSAPP':
      return 'WhatsApp';
    default:
      return 'Ação externa';
  }
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const StoreFront: React.FC<StoreFrontProps> = ({ store }) => {
  const [registeredReferrers, setRegisteredReferrers] = useState<Referrer[]>([]);
  const [referredName, setReferredName] = useState('');
  const [referredPhone, setReferredPhone] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');
  const [selectedReferrerId, setSelectedReferrerId] = useState('');
  const [referralDate, setReferralDate] = useState(getTodayString());
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [confirmedExternalActions, setConfirmedExternalActions] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledActions = useMemo(
    () => store.campaignActions.filter((action) => action.enabled && action.url.trim()),
    [store.campaignActions]
  );
  const requiredActions = enabledActions.filter((action) => action.required);
  const hasCompletedRequiredActions = requiredActions.every((action) =>
    completedActionIds.includes(action.id)
  );
  const filteredReferrers = useMemo(() => {
    const query = referrerName.trim().toLowerCase();
    if (!query) return registeredReferrers.slice(0, 6);

    return registeredReferrers
      .filter((referrer) => referrer.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [referrerName, registeredReferrers]);

  const canSubmit =
    referredName.trim() &&
    referredPhone.trim() &&
    referrerName.trim() &&
    referrerPhone.trim() &&
    selectedReferrerId &&
    referralDate &&
    !isSubmitting &&
    (requiredActions.length === 0 || (hasCompletedRequiredActions && confirmedExternalActions));

  useEffect(() => {
    const loadReferrers = async () => {
      const data = await getReferrers(store.id);
      setRegisteredReferrers(data.filter((referrer) => referrer.isActive));
    };

    loadReferrers();
  }, [store.id]);

  const resetForm = () => {
    setReferredName('');
    setReferredPhone('');
    setReferrerName('');
    setReferrerPhone('');
    setSelectedReferrerId('');
    setReferralDate(getTodayString());
    setCompletedActionIds([]);
    setConfirmedExternalActions(false);
    setSuccess(false);
  };

  const handleActionClick = (action: CampaignAction) => {
    window.open(action.url, '_blank', 'noopener,noreferrer');
    setCompletedActionIds((current) =>
      current.includes(action.id) ? current : [...current, action.id]
    );
  };

  const handleReferrerInputChange = (value: string) => {
    setReferrerName(value);
    setSelectedReferrerId('');
    setReferrerPhone('');
  };

  const handleSelectReferrer = (referrer: Referrer) => {
    setReferrerName(referrer.name);
    setReferrerPhone(referrer.phone);
    setSelectedReferrerId(referrer.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      await submitReferral(store, {
        storeId: store.id,
        referredName,
        referredPhone,
        selectedReferrerId,
        referrerName,
        referrerPhone,
        referralDate,
        completedActionIds
      });

      setSuccess(true);
    } catch (error) {
      console.error('Erro ao enviar indicação:', error);
      alert(error instanceof Error ? error.message : 'Erro ao enviar os dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-cyan-400/20 rounded-full flex items-center justify-center mb-6 neon-border">
          <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-black italic text-white mb-4 neon-text">CADASTRO FINALIZADO</h2>
        <p className="text-slate-400 max-w-md mb-8">
          A loja <b>{store.name}</b> recebeu seus dados com sucesso.
        </p>
        {store.customerBenefitTitle && (
          <div className="mb-8 max-w-md rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">Seu benefício</p>
            <p className="text-xl font-black italic text-white">{store.customerBenefitTitle}</p>
            {store.customerBenefitDescription && (
              <p className="text-slate-300 text-sm mt-2">{store.customerBenefitDescription}</p>
            )}
            <p className="text-slate-300 text-sm mt-3">
              Parabéns! Agora vá até a loja para resgatar seu benefício.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-4 py-8 md:py-12">
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-lg md:text-2xl font-bold text-cyan-400 uppercase tracking-widest mb-2">{store.name}</h2>
        <div className="flex flex-col leading-tight items-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black italic text-white uppercase tracking-tight">
            INDICAÇÃO
          </h1>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black italic text-[#2563eb] uppercase tracking-tight mt-[-4px] md:mt-[-8px]">
            PREMIADA
          </h1>
        </div>
        <p className="text-slate-500 mt-2 font-semibold text-sm md:text-base">
          {store.formSubtitle || 'Preencha seus dados abaixo para registrar sua indicação.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="grid gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
          {store.customerBenefitTitle && (
            <div className="rounded-3xl border border-cyan-400/30 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_rgba(8,15,33,0.92)_65%)] p-6 text-center shadow-[0_0_40px_rgba(34,211,238,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-400 mb-3">
                Benefício para você
              </p>
              <h3 className="text-3xl md:text-4xl font-black italic text-white">{store.customerBenefitTitle}</h3>
              {store.customerBenefitDescription && (
                <p className="text-slate-300 text-sm md:text-base mt-3 max-w-xl mx-auto">
                  {store.customerBenefitDescription}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase ml-1">Qual é o seu nome?</label>
            <input
              required
              type="text"
              placeholder="Ex.: João Silva"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all"
              value={referredName}
              onChange={(e) => setReferredName(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase ml-1">Qual é o seu telefone?</label>
              <input
                required
                type="tel"
                placeholder="(00) 00000-0000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all"
                value={referredPhone}
                onChange={(e) => setReferredPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase ml-1">Qual é a data de hoje?</label>
              <input
                required
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all"
                value={referralDate}
                onChange={(e) => setReferralDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase ml-1">Quem indicou nossa loja para você?</label>
            <input
              required
              type="text"
              placeholder="Digite para buscar um indicador cadastrado"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-400 transition-all"
              value={referrerName}
              onChange={(e) => handleReferrerInputChange(e.target.value)}
            />
            {registeredReferrers.length > 0 && referrerName.trim() && !selectedReferrerId && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                {filteredReferrers.length > 0 ? (
                  filteredReferrers.map((referrer) => (
                    <button
                      key={referrer.id}
                      type="button"
                      onClick={() => handleSelectReferrer(referrer)}
                      className="w-full px-4 py-3 text-left border-b border-slate-800 last:border-b-0 hover:bg-slate-900 transition-colors"
                    >
                      <p className="text-white font-medium">{referrer.name}</p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    Nenhum indicador cadastrado encontrado com esse nome.
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Escolha um nome já cadastrado pela loja para evitar erro de indicação.
            </p>
          </div>

          {registeredReferrers.length === 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              Esta loja ainda não cadastrou indicadores. Peça para a equipe da loja registrar primeiro os nomes dos indicadores no painel.
            </div>
          )}

        </div>

        {enabledActions.length > 0 && (
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="text-lg font-black italic text-white uppercase">Ações da campanha</h3>
              <p className="text-slate-400 text-sm mt-1">
                Antes de finalizar, cumpra as ações que a loja deixou configuradas.
              </p>
            </div>

            <div className="grid gap-3">
              {enabledActions.map((action) => {
                const isCompleted = completedActionIds.includes(action.id);
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleActionClick(action)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      isCompleted
                        ? 'border-green-500/40 bg-green-500/10'
                        : 'border-slate-800 bg-slate-950 hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-bold">{action.label}</p>
                        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
                          {formatTypeLabel(action.type)} {action.required ? 'Obrigatório' : 'Opcional'}
                        </p>
                      </div>
                      <span className={`text-xs font-black uppercase ${isCompleted ? 'text-green-400' : 'text-cyan-400'}`}>
                        {isCompleted ? 'Concluído' : 'Abrir'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {requiredActions.length > 0 && (
              <label className="flex items-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-400 transition-all">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-cyan-400"
                  checked={confirmedExternalActions}
                  onChange={(e) => setConfirmedExternalActions(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-300">
                  Confirmo que realizei as ações obrigatórias acima antes de finalizar o cadastro.
                </span>
              </label>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-5 rounded-2xl font-black italic text-xl uppercase tracking-widest transition-all ${
            canSubmit
              ? 'bg-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-95'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          {isSubmitting ? 'ENVIANDO...' : 'FINALIZAR INDICAÇÃO'}
        </button>
      </form>
    </div>
  );
};

export default StoreFront;
