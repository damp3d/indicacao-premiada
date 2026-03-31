import { db, isLocalDataMode } from '../firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  CampaignAction,
  RedeemRequest,
  Referral,
  ReferralSubmitPayload,
  Referrer,
  Store
} from '../types';

export interface SystemConfig {
  logoUrl: string | null;
}

const CONFIG_DOC_ID = 'main_config';
const LOCAL_SYSTEM_KEY = 'oqvp_system_config';
const LOCAL_STORES_KEY = 'oqvp_stores';
const LOCAL_REFERRERS_KEY = 'oqvp_referrers';
const LOCAL_REFERRALS_KEY = 'oqvp_referrals';
const LOCAL_REDEEMS_KEY = 'oqvp_redeems';

const defaultCampaignActions: CampaignAction[] = [
  {
    id: 'google-review',
    label: 'Avaliar no Google',
    url: '',
    type: 'GOOGLE_REVIEW',
    required: false,
    enabled: false
  },
  {
    id: 'instagram',
    label: 'Seguir no Instagram',
    url: '',
    type: 'INSTAGRAM',
    required: false,
    enabled: false
  }
];

const localSeedStore: Store = {
  id: 'demo-store',
  name: 'Loja Exemplo',
  email: 'loja@exemplo.com',
  authUid: 'demo-store-auth',
  passwordHash: '1234',
  startDate: '2026-03-18',
  expiryDate: '2026-12-31',
  publicSlug: 'loja-exemplo',
  whatsappNumber: '5511999999999',
  formTitle: 'Programa de indicacao premiada',
  formSubtitle: 'Preencha os dados para registrar a indicacao e acumular recompensas.',
  shareMessage: 'Indique nossa loja e acompanhe seus ganhos: {LINK}',
  indicatorRewardType: 'FIXED',
  indicatorRewardValue: 10,
  minRedeemAmount: 50,
  customerBenefitTitle: '10% OFF na sua compra',
  customerBenefitDescription: 'Apresente esta confirmacao na loja para receber seu beneficio.',
  rewardMode: 'ON_PURCHASE',
  active: true,
  campaignActions: defaultCampaignActions
};

const localSeedReferrer: Referrer = {
  id: 'ref-ana',
  storeId: 'demo-store',
  name: 'Ana Souza',
  phone: '5511988880000',
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  isActive: true
};

const localSeedReferrals: Referral[] = [
  {
    id: 'ind-001',
    storeId: 'demo-store',
    referrerId: 'ref-ana',
    referrerName: 'Ana Souza',
    referrerPhone: '5511988880000',
    referredName: 'Carlos Lima',
    referredPhone: '5511991112222',
    referralDate: '2026-03-25',
    notes: 'Cliente interessado em comprar presente personalizado.',
    status: 'APPROVED',
    rewardAmount: 10,
    purchaseAmount: 120,
    customerBenefitStatus: 'REDEEMED',
    customerBenefitRedeemed: true,
    customerBenefitRedeemedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    completedActionIds: []
  },
  {
    id: 'ind-002',
    storeId: 'demo-store',
    referrerId: 'ref-ana',
    referrerName: 'Ana Souza',
    referrerPhone: '5511988880000',
    referredName: 'Marina Dias',
    referredPhone: '5511993334444',
    referralDate: '2026-03-27',
    notes: 'Veio pelo chaveiro e quer receber novidades.',
    status: 'NEW',
    rewardAmount: 10,
    purchaseAmount: 0,
    customerBenefitStatus: 'AWAITING_REDEEM',
    customerBenefitRedeemed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    completedActionIds: []
  }
];

const localSeedRedeems: RedeemRequest[] = [
  {
    id: 'res-001',
    storeId: 'demo-store',
    referrerId: 'ref-ana',
    referrerName: 'Ana Souza',
    amount: 10,
    status: 'PAID',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    processedAt: Date.now() - 1000 * 60 * 60 * 24 * 2
  }
];

const isBrowser = typeof window !== 'undefined';

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeStore = (store: Store): Store => ({
  ...store,
  indicatorRewardType: store.indicatorRewardType ?? 'FIXED',
  indicatorRewardValue: Number(store.indicatorRewardValue ?? 0),
  minRedeemAmount: Number(store.minRedeemAmount ?? 0),
  customerBenefitTitle: store.customerBenefitTitle ?? '',
  customerBenefitDescription: store.customerBenefitDescription ?? '',
  rewardMode: store.rewardMode ?? 'ON_SUBMISSION',
  active: store.active !== false,
  campaignActions:
    store.campaignActions?.map((action) => ({
      ...action,
      enabled: action.enabled !== false,
      required: Boolean(action.required)
    })) ?? []
});

const normalizeReferrer = (referrer: Referrer): Referrer => ({
  ...referrer,
  isActive: referrer.isActive !== false
});

const normalizeReferral = (referral: Referral): Referral => ({
  ...referral,
  completedActionIds: referral.completedActionIds ?? [],
  rewardAmount: Number(referral.rewardAmount ?? 0),
  purchaseAmount: Number(referral.purchaseAmount ?? 0),
  customerBenefitStatus:
    referral.customerBenefitStatus ??
    (referral.customerBenefitRedeemed ? 'REDEEMED' : 'AWAITING_REDEEM'),
  customerBenefitRedeemed: Boolean(referral.customerBenefitRedeemed),
  customerBenefitRedeemedAt: referral.customerBenefitRedeemedAt
});

const normalizeRedeem = (redeem: RedeemRequest): RedeemRequest => ({
  ...redeem,
  amount: Number(redeem.amount ?? 0)
});

const removeUndefinedFields = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;

const readLocalJson = <T>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return fallback;

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`Error parsing local storage key ${key}:`, error);
    return fallback;
  }
};

const writeLocalJson = <T>(key: string, value: T) => {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const ensureLocalSeedData = () => {
  if (!isBrowser) return;

  const existingStores = readLocalJson<Store[]>(LOCAL_STORES_KEY, []);
  if (existingStores.length === 0) {
    writeLocalJson(LOCAL_STORES_KEY, [localSeedStore]);
  }

  const existingConfig = window.localStorage.getItem(LOCAL_SYSTEM_KEY);
  if (!existingConfig) {
    writeLocalJson<SystemConfig>(LOCAL_SYSTEM_KEY, { logoUrl: null });
  }

  const existingReferrers = window.localStorage.getItem(LOCAL_REFERRERS_KEY);
  if (!existingReferrers) {
    writeLocalJson<Referrer[]>(LOCAL_REFERRERS_KEY, [localSeedReferrer]);
  }

  const existingReferrals = window.localStorage.getItem(LOCAL_REFERRALS_KEY);
  if (!existingReferrals) {
    writeLocalJson<Referral[]>(LOCAL_REFERRALS_KEY, localSeedReferrals);
  }

  const existingRedeems = window.localStorage.getItem(LOCAL_REDEEMS_KEY);
  if (!existingRedeems) {
    writeLocalJson<RedeemRequest[]>(LOCAL_REDEEMS_KEY, localSeedRedeems);
  }
};

export const getSystemConfig = async (): Promise<SystemConfig> => {
  if (isLocalDataMode) {
    ensureLocalSeedData();
    return readLocalJson<SystemConfig>(LOCAL_SYSTEM_KEY, { logoUrl: null });
  }

  try {
    if (!db) return { logoUrl: null };
    const docRef = doc(db, 'system', CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as SystemConfig;
    }

    return { logoUrl: null };
  } catch (error) {
    console.error('Error getting config:', error);
    return { logoUrl: null };
  }
};

export const saveSystemConfig = async (config: SystemConfig) => {
  if (isLocalDataMode) {
    writeLocalJson(LOCAL_SYSTEM_KEY, config);
    return;
  }

  if (!db) return;
  await setDoc(doc(db, 'system', CONFIG_DOC_ID), removeUndefinedFields(config));
};

export const getStores = async (): Promise<Store[]> => {
  if (isLocalDataMode) {
    ensureLocalSeedData();
    return readLocalJson<Store[]>(LOCAL_STORES_KEY, []).map(normalizeStore);
  }

  if (!db) return [];
  const querySnapshot = await getDocs(collection(db, 'stores'));
  return querySnapshot.docs.map((storeDoc) =>
    normalizeStore({ id: storeDoc.id, ...storeDoc.data() } as Store)
  );
};

export const getStoreBySlug = async (publicSlug: string): Promise<Store | null> => {
  const stores = await getStores();
  return stores.find((store) => store.publicSlug === publicSlug) ?? null;
};

export const getStoreByEmail = async (email: string): Promise<Store | null> => {
  const stores = await getStores();
  return stores.find((store) => store.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

export const saveStore = async (store: Store) => {
  const normalizedStore = normalizeStore(store);

  if (isLocalDataMode) {
    ensureLocalSeedData();
    const stores = readLocalJson<Store[]>(LOCAL_STORES_KEY, []);
    const existingIndex = stores.findIndex((item) => item.id === normalizedStore.id);

    if (existingIndex >= 0) {
      stores[existingIndex] = normalizedStore;
    } else {
      stores.push(normalizedStore);
    }

    writeLocalJson(LOCAL_STORES_KEY, stores);
    return;
  }

  if (!db) return;
  const { id, ...data } = normalizedStore;
  await setDoc(doc(db, 'stores', id), removeUndefinedFields(data));
};

export const deleteStore = async (id: string) => {
  if (isLocalDataMode) {
    const stores = readLocalJson<Store[]>(LOCAL_STORES_KEY, []);
    const referrers = readLocalJson<Referrer[]>(LOCAL_REFERRERS_KEY, []);
    const referrals = readLocalJson<Referral[]>(LOCAL_REFERRALS_KEY, []);
    const redeems = readLocalJson<RedeemRequest[]>(LOCAL_REDEEMS_KEY, []);

    writeLocalJson(LOCAL_STORES_KEY, stores.filter((store) => store.id !== id));
    writeLocalJson(LOCAL_REFERRERS_KEY, referrers.filter((referrer) => referrer.storeId !== id));
    writeLocalJson(LOCAL_REFERRALS_KEY, referrals.filter((referral) => referral.storeId !== id));
    writeLocalJson(LOCAL_REDEEMS_KEY, redeems.filter((redeem) => redeem.storeId !== id));
    return;
  }

  if (!db) return;
  await deleteDoc(doc(db, 'stores', id));
};

export const getReferrers = async (storeId?: string): Promise<Referrer[]> => {
  if (isLocalDataMode) {
    ensureLocalSeedData();
    const referrers = readLocalJson<Referrer[]>(LOCAL_REFERRERS_KEY, []).map(normalizeReferrer);
    const results = storeId ? referrers.filter((item) => item.storeId === storeId) : referrers;
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!db) return [];
  const baseCollection = collection(db, 'referrers');
  const referrersQuery = storeId
    ? query(baseCollection, where('storeId', '==', storeId))
    : query(baseCollection, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(referrersQuery);
  const results = querySnapshot.docs.map((item) =>
    normalizeReferrer({ id: item.id, ...item.data() } as Referrer)
  );
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
};

export const saveReferrer = async (referrer: Referrer) => {
  const normalizedReferrer = normalizeReferrer(referrer);

  if (isLocalDataMode) {
    const referrers = readLocalJson<Referrer[]>(LOCAL_REFERRERS_KEY, []);
    const existingIndex = referrers.findIndex((item) => item.id === normalizedReferrer.id);

    if (existingIndex >= 0) {
      referrers[existingIndex] = normalizedReferrer;
    } else {
      referrers.push(normalizedReferrer);
    }

    writeLocalJson(LOCAL_REFERRERS_KEY, referrers);
    return;
  }

  if (!db) return;
  const { id, ...data } = normalizedReferrer;
  await setDoc(doc(db, 'referrers', id), removeUndefinedFields(data));
};

export const getReferrals = async (storeId?: string): Promise<Referral[]> => {
  if (isLocalDataMode) {
    ensureLocalSeedData();
    const referrals = readLocalJson<Referral[]>(LOCAL_REFERRALS_KEY, []).map(normalizeReferral);
    const results = storeId ? referrals.filter((item) => item.storeId === storeId) : referrals;
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!db) return [];
  const baseCollection = collection(db, 'referrals');
  const referralsQuery = storeId
    ? query(baseCollection, where('storeId', '==', storeId))
    : query(baseCollection, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(referralsQuery);
  const results = querySnapshot.docs.map((item) =>
    normalizeReferral({ id: item.id, ...item.data() } as Referral)
  );
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
};

export const addReferral = async (referral: Referral) => {
  const normalizedReferral = normalizeReferral(referral);

  if (isLocalDataMode) {
    const referrals = readLocalJson<Referral[]>(LOCAL_REFERRALS_KEY, []);
    referrals.push(normalizedReferral);
    writeLocalJson(LOCAL_REFERRALS_KEY, referrals);
    return;
  }

  if (!db) return;
  const { id, ...data } = normalizedReferral;

  if (id) {
    await setDoc(doc(db, 'referrals', id), removeUndefinedFields({ ...data, id }));
    return;
  }

  const docRef = await addDoc(collection(db, 'referrals'), removeUndefinedFields(data));
  await updateDoc(docRef, { id: docRef.id });
};

export const updateReferral = async (referral: Referral) => {
  const normalizedReferral = normalizeReferral(referral);

  if (isLocalDataMode) {
    const referrals = readLocalJson<Referral[]>(LOCAL_REFERRALS_KEY, []);
    writeLocalJson(
      LOCAL_REFERRALS_KEY,
      referrals.map((item) => (item.id === normalizedReferral.id ? normalizedReferral : item))
    );
    return;
  }

  if (!db) return;
  const { id, ...data } = normalizedReferral;
  await updateDoc(doc(db, 'referrals', id), removeUndefinedFields(data as Record<string, unknown>));
};

export const deleteReferral = async (id: string) => {
  if (isLocalDataMode) {
    const referrals = readLocalJson<Referral[]>(LOCAL_REFERRALS_KEY, []);
    writeLocalJson(
      LOCAL_REFERRALS_KEY,
      referrals.filter((item) => item.id !== id)
    );
    return;
  }

  if (!db) return;
  await deleteDoc(doc(db, 'referrals', id));
};

export const getRedeemRequests = async (storeId?: string): Promise<RedeemRequest[]> => {
  if (isLocalDataMode) {
    ensureLocalSeedData();
    const redeems = readLocalJson<RedeemRequest[]>(LOCAL_REDEEMS_KEY, []).map(normalizeRedeem);
    const results = storeId ? redeems.filter((item) => item.storeId === storeId) : redeems;
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!db) return [];
  const baseCollection = collection(db, 'redeemRequests');
  const redeemQuery = storeId
    ? query(baseCollection, where('storeId', '==', storeId))
    : query(baseCollection, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(redeemQuery);
  const results = querySnapshot.docs.map((item) =>
    normalizeRedeem({ id: item.id, ...item.data() } as RedeemRequest)
  );
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
};

export const addRedeemRequest = async (redeemRequest: RedeemRequest) => {
  const normalizedRedeem = normalizeRedeem(redeemRequest);

  if (isLocalDataMode) {
    const redeems = readLocalJson<RedeemRequest[]>(LOCAL_REDEEMS_KEY, []);
    redeems.push(normalizedRedeem);
    writeLocalJson(LOCAL_REDEEMS_KEY, redeems);
    return;
  }

  if (!db) return;
  const { id, ...data } = normalizedRedeem;
  await setDoc(doc(db, 'redeemRequests', id), removeUndefinedFields(data));
};

export const updateRedeemRequest = async (redeemRequest: RedeemRequest) => {
  const normalizedRedeem = normalizeRedeem(redeemRequest);

  if (isLocalDataMode) {
    const redeems = readLocalJson<RedeemRequest[]>(LOCAL_REDEEMS_KEY, []);
    writeLocalJson(
      LOCAL_REDEEMS_KEY,
      redeems.map((item) => (item.id === normalizedRedeem.id ? normalizedRedeem : item))
    );
    return;
  }

  if (!db) return;
  const { id, ...data } = normalizedRedeem;
  await updateDoc(doc(db, 'redeemRequests', id), removeUndefinedFields(data as Record<string, unknown>));
};

export const getReferralBalanceSummary = (
  store: Store,
  referrerId: string,
  referrals: Referral[],
  redeems: RedeemRequest[]
) => {
  const totalEarned = referrals
    .filter(
      (referral) =>
        referral.referrerId === referrerId &&
        referral.customerBenefitStatus !== 'CANCELED' &&
        (store.indicatorRewardType === 'PERCENTAGE'
          ? Number(referral.purchaseAmount ?? 0) > 0
          : store.rewardMode === 'ON_PURCHASE'
            ? Number(referral.purchaseAmount ?? 0) > 0
            : true)
    )
    .reduce((sum, referral) => sum + referral.rewardAmount, 0);

  const totalRequested = redeems
    .filter(
      (redeem) =>
        redeem.referrerId === referrerId &&
        (redeem.status === 'REQUESTED' || redeem.status === 'APPROVED' || redeem.status === 'PAID')
    )
    .reduce((sum, redeem) => sum + redeem.amount, 0);

  const totalPaid = redeems
    .filter((redeem) => redeem.referrerId === referrerId && redeem.status === 'PAID')
    .reduce((sum, redeem) => sum + redeem.amount, 0);

  return {
    totalEarned,
    totalRequested,
    totalPaid,
    availableBalance: Math.max(totalEarned - totalRequested, 0)
  };
};

export const submitReferral = async (store: Store, payload: ReferralSubmitPayload) => {
  const referrals = await getReferrals(store.id);
  const normalizedReferredPhone = payload.referredPhone.replace(/\D/g, '');

  const duplicatedReferral = referrals.find(
    (item) => item.referredPhone.replace(/\D/g, '') === normalizedReferredPhone
  );

  if (duplicatedReferral) {
    throw new Error('Já existe um cadastro para este número de telefone nesta loja.');
  }

  const referrers = await getReferrers(store.id);
  const normalizedPhone = payload.referrerPhone.replace(/\D/g, '');

  let referrer =
    referrers.find((item) => item.phone.replace(/\D/g, '') === normalizedPhone) ?? null;

  if (!referrer) {
    referrer = {
      id: generateId('ref'),
      storeId: store.id,
      name: payload.referrerName.trim(),
      phone: payload.referrerPhone.trim(),
      createdAt: Date.now(),
      isActive: true
    };

    await saveReferrer(referrer);
  } else if (referrer.name !== payload.referrerName.trim()) {
    const updatedReferrer = { ...referrer, name: payload.referrerName.trim() };
    await saveReferrer(updatedReferrer);
    referrer = updatedReferrer;
  }

  const referral: Referral = {
    id: generateId('ind'),
    storeId: store.id,
    referrerId: referrer.id,
    referrerName: referrer.name,
    referrerPhone: referrer.phone,
    referredName: payload.referredName.trim(),
    referredPhone: payload.referredPhone.trim(),
    referralDate: payload.referralDate,
    notes: payload.notes?.trim() || '',
    status: 'NEW',
    rewardAmount: store.indicatorRewardType === 'FIXED' ? store.indicatorRewardValue : 0,
    purchaseAmount: 0,
    customerBenefitStatus: 'AWAITING_REDEEM',
    customerBenefitRedeemed: false,
    createdAt: Date.now(),
    completedActionIds: payload.completedActionIds
  };

  await addReferral(referral);
  return { referrer, referral };
};

export const createRedeemRequestForReferrer = async (
  store: Store,
  referrer: Referrer,
  amount: number
) => {
  const redeemRequest: RedeemRequest = {
    id: generateId('res'),
    storeId: store.id,
    referrerId: referrer.id,
    referrerName: referrer.name,
    amount,
    status: 'REQUESTED',
    createdAt: Date.now()
  };

  await addRedeemRequest(redeemRequest);
  return redeemRequest;
};
