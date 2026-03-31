export type CampaignActionType = 'GOOGLE_REVIEW' | 'INSTAGRAM' | 'WHATSAPP' | 'CUSTOM';

export interface CampaignAction {
  id: string;
  label: string;
  url: string;
  type: CampaignActionType;
  required: boolean;
  enabled: boolean;
}

export interface Store {
  id: string;
  name: string;
  email?: string;
  authUid?: string;
  passwordHash?: string;
  startDate?: string;
  expiryDate?: string;
  publicSlug: string;
  whatsappNumber: string;
  shareMessage?: string;
  formTitle?: string;
  formSubtitle?: string;
  indicatorRewardType: 'FIXED' | 'PERCENTAGE';
  indicatorRewardValue: number;
  minRedeemAmount: number;
  customerBenefitTitle?: string;
  customerBenefitDescription?: string;
  rewardMode: 'ON_SUBMISSION' | 'ON_PURCHASE';
  active: boolean;
  campaignActions: CampaignAction[];
}

export interface Referrer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  createdAt: number;
  isActive: boolean;
}

export type ReferralStatus = 'NEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface Referral {
  id: string;
  storeId: string;
  referrerId: string;
  referrerName: string;
  referrerPhone: string;
  referredName: string;
  referredPhone: string;
  referralDate: string;
  notes?: string;
  status: ReferralStatus;
  rewardAmount: number;
  purchaseAmount?: number;
  customerBenefitStatus: 'AWAITING_REDEEM' | 'REDEEMED' | 'CANCELED';
  customerBenefitRedeemed: boolean;
  customerBenefitRedeemedAt?: number;
  createdAt: number;
  completedActionIds: string[];
}

export type RedeemStatus = 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface RedeemRequest {
  id: string;
  storeId: string;
  referrerId: string;
  referrerName: string;
  amount: number;
  status: RedeemStatus;
  createdAt: number;
  processedAt?: number;
}

export interface ReferralSubmitPayload {
  storeId: string;
  referredName: string;
  referredPhone: string;
  referrerName: string;
  referrerPhone: string;
  referralDate: string;
  notes?: string;
  completedActionIds: string[];
}

export type ViewState = 'HOME' | 'STORE_PAGE' | 'ADMIN_LOGIN' | 'SUPER_ADMIN' | 'STORE_ADMIN';
