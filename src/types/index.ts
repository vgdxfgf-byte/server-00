export type TransactionStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';

export type PaymentMethodType = 'upi' | 'bank_transfer';

export interface BankBeneficiary {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'savings' | 'current';
  isDefault?: boolean;
}

export interface UpiBeneficiary {
  id: string;
  upiId: string;
  holderName: string;
  provider: string; // e.g., 'Google Pay / HDFC', 'PhonePe', 'Paytm'
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  kycStatus: 'verified' | 'pending' | 'unverified';
  avatarUrl?: string;
  availableBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  dailyWithdrawalLimit: number;
  withdrawnToday: number;
  registeredAt: string;
  bankBeneficiaries: BankBeneficiary[];
  upiBeneficiaries: UpiBeneficiary[];
  isFrozen?: boolean;
  address?: string;
  panNumber?: string;
  pendingFundNote?: string;
}

export interface StatusTimelineEvent {
  status: TransactionStatus;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  feeAmount: number;
  gstAmount: number;
  netPayableAmount: number;
  paymentMethod: PaymentMethodType;
  paymentDetails: {
    upiId?: string;
    holderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountType?: string;
  };
  status: TransactionStatus;
  utrNumber?: string;
  rejectionReason?: string;
  adminNote?: string;
  refundFeeAmount?: number;
  refundedAmount?: number;
  statusTimeline: StatusTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  referenceNumber: string;
  upcomingWithdrawalId?: string;
}

export interface DepositTransaction {
  id: string;
  userId: string;
  amount: number;
  method: 'UPI' | 'NetBanking' | 'DebitCard';
  status: 'completed';
  referenceNumber: string;
  timestamp: string;
}

export interface FeeConfiguration {
  feeType: 'flat' | 'percentage' | 'flat_plus_percent';
  flatFee: number; // e.g. 15 INR
  percentageFee: number; // e.g. 1.0 %
  gstRatePercent: number; // e.g. 18 %
  minWithdrawalAmount: number; // e.g. 100 INR
  maxWithdrawalAmountPerTxn: number; // e.g. 100000 INR
  dailyCeilingLimit: number; // e.g. 200000 INR
  freeWithdrawalsPerMonth: number;
  refundFeeEnabled?: boolean;
  refundFeeType?: 'flat' | 'percentage' | 'flat_plus_percent';
  refundFlatFee?: number;
  refundPercentageFee?: number;
}

export interface BalanceAdjustment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'increase' | 'decrease' | 'set_fixed';
  targetFund?: 'availableBalance' | 'dailyWithdrawalLimit' | 'withdrawnToday' | 'pendingWithdrawals' | 'totalWithdrawn';
  previousBalance: number;
  adjustmentAmount: number; // absolute change or delta
  newBalance: number;
  reason: string;
  adminName: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'withdrawal' | 'balance' | 'security' | 'system';
  timestamp: string;
  read: boolean;
  linkTxnId?: string;
}

export interface PaymentMethodSetting {
  id: string;
  type: PaymentMethodType;
  name: string;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  estimatedSettlement: string;
}

export interface SystemConfig {
  withdrawalsEnabled: boolean;
  maintenanceNotice?: string;
  require2FA: boolean;
  paymentMethods: PaymentMethodSetting[];
}

export interface AdminLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  targetId?: string;
  details: string;
  ipAddress: string;
}

export type UpcomingWithdrawalStatus = 'upcoming' | 'ready' | 'completed' | 'cancelled';

export interface UpcomingWithdrawal {
  id: string;
  targetUserId: string; // 'ALL' for broadcast or specific user ID
  targetUserName: string;
  title: string;
  withdrawalAmount: number;
  withdrawalCharge: number;
  netAmount: number;
  scheduledDate: string;
  paymentMethod: 'upi' | 'bank_transfer' | 'any';
  status: UpcomingWithdrawalStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSecurityConfig {
  enabled: boolean;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  updatedBy: string;
  updatedAt?: string;
}
