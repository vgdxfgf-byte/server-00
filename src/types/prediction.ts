export type SportCategory = 'Cricket' | 'Football' | 'Basketball' | 'Tennis' | 'Esports' | 'Formula 1' | 'MMA / Boxing' | 'Other';

export type PredictionStatus = 'open' | 'closed' | 'settled' | 'cancelled';
export type PredictionChoice = 'YES' | 'NO';
export type UserPredictionOutcome = 'pending' | 'won' | 'lost' | 'refunded';

export interface PlatformUser {
  id: string;
  username: string;
  passwordHash: string; // Plaintext or hash displayed for demo admin creation
  displayName: string;
  avatarUrl?: string;
  coinBalance: number; // Virtual Coins (starts at 0)
  status: 'active' | 'suspended' | 'blocked';
  notes?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: 'super_admin' | 'moderator';
}

export interface PredictionMarket {
  id: string;
  title: string;
  description: string;
  category: SportCategory;
  sportIcon?: string;
  matchEvent: string; // e.g. "India vs Australia - 3rd ODI"
  eventDate: string; // ISO date
  closingTime: string; // ISO date after which no predictions accepted
  status: PredictionStatus;
  
  // Odds (Decimal odds, e.g. 1.85 for YES, 2.10 for NO)
  yesOdds: number;
  noOdds: number;

  // Pools
  totalYesCoins: number;
  totalNoCoins: number;
  totalParticipants: number;

  // Settlement
  resolvedOutcome?: PredictionChoice;
  settledAt?: string;
  settledBy?: string;
  resolutionNotes?: string;

  featured?: boolean;
  minBet: number;
  maxBet: number;
  createdAt: string;
}

export interface UserPrediction {
  id: string;
  userId: string;
  username: string;
  marketId: string;
  marketTitle: string;
  category: SportCategory;
  matchEvent: string;
  choice: PredictionChoice;
  coinsStaked: number;
  oddsAtBet: number;
  potentialPayout: number; // coinsStaked * oddsAtBet
  actualPayout?: number;
  status: UserPredictionOutcome;
  placedAt: string;
  settledAt?: string;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  username: string;
  type: 'admin_credit' | 'admin_debit' | 'prediction_stake' | 'prediction_win' | 'prediction_refund' | 'simulated_withdrawal' | 'simulated_deposit';
  amount: number; // Virtual coins
  previousBalance: number;
  newBalance: number;
  reason: string;
  performedBy: string; // Admin username or 'System'
  timestamp: string;
  marketId?: string;
  withdrawalRequestId?: string;
}

export interface SimulatedWithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  coinAmount: number;
  destinationDetails: string; // e.g. "Virtual Vault #9821" or simulated destination
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
  active: boolean;
}

export interface PlatformAuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  targetId?: string;
  details: string;
}
