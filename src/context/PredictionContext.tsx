import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PlatformUser,
  AdminAccount,
  PredictionMarket,
  UserPrediction,
  CoinTransaction,
  SimulatedWithdrawalRequest,
  PlatformAnnouncement,
  PlatformAuditLog,
  PredictionChoice,
  SportCategory,
} from '../types/prediction';
import {
  INITIAL_ADMIN,
  INITIAL_USERS,
  INITIAL_MARKETS,
  INITIAL_PREDICTIONS,
  INITIAL_TRANSACTIONS,
  INITIAL_WITHDRAWALS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
} from '../data/predictionSeed';
import { sound } from '../utils/audio';

interface PredictionContextType {
  // App switcher & navigation
  activeApp: 'user' | 'admin';
  setActiveApp: (app: 'user' | 'admin') => void;

  // Session state
  currentAdmin: AdminAccount | null;
  currentUser: PlatformUser | null;
  
  // Auth actions
  adminLogin: (username: string, password: string) => { success: boolean; error?: string };
  adminLogout: () => void;
  adminChangePassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };
  userLogin: (username: string, password: string) => { success: boolean; error?: string };
  userLogout: () => void;
  userChangePassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };

  // Data
  users: PlatformUser[];
  markets: PredictionMarket[];
  userPredictions: UserPrediction[];
  transactions: CoinTransaction[];
  withdrawalRequests: SimulatedWithdrawalRequest[];
  announcements: PlatformAnnouncement[];
  auditLogs: PlatformAuditLog[];

  // User Actions
  placePrediction: (params: {
    marketId: string;
    choice: PredictionChoice;
    coins: number;
  }) => { success: boolean; error?: string };
  requestSimulatedWithdrawal: (coins: number, destination: string) => { success: boolean; error?: string };

  // Admin Actions
  adminCreateUser: (params: {
    username: string;
    password: string;
    displayName: string;
    initialCoins?: number;
    notes?: string;
  }) => { success: boolean; error?: string; user?: PlatformUser };
  adminUpdateUserStatus: (userId: string, status: 'active' | 'suspended' | 'blocked', reason: string) => void;
  adminResetUserPassword: (userId: string, newPassword: string) => { success: boolean; error?: string };
  adminAdjustCoins: (params: {
    userId: string;
    type: 'admin_credit' | 'admin_debit' | 'set_balance';
    amount: number;
    reason: string;
  }) => { success: boolean; error?: string };
  adminDeleteUser: (userId: string) => { success: boolean; error?: string };

  // Market & Odds Management
  adminCreateMarket: (marketData: Omit<PredictionMarket, 'id' | 'totalYesCoins' | 'totalNoCoins' | 'totalParticipants' | 'createdAt'>) => { success: boolean; error?: string };
  adminUpdateMarketOdds: (marketId: string, yesOdds: number, noOdds: number) => { success: boolean; error?: string };
  adminUpdateMarketStatus: (marketId: string, status: 'open' | 'closed' | 'cancelled') => void;
  adminResolveMarket: (marketId: string, winningOutcome: PredictionChoice, notes: string) => { success: boolean; error?: string };
  adminDeleteMarket: (marketId: string) => { success: boolean; error?: string };

  // Simulated Withdrawal Approval
  adminApproveWithdrawal: (requestId: string) => { success: boolean; error?: string };
  adminRejectWithdrawal: (requestId: string, reason: string) => { success: boolean; error?: string };

  // Announcements & Utilities
  adminCreateAnnouncement: (title: string, content: string, priority: 'normal' | 'high' | 'urgent') => void;
  adminDeleteAnnouncement: (id: string) => void;
  resetAllPlatformData: () => void;
}

const PredictionContext = createContext<PredictionContextType | undefined>(undefined);

const STORAGE_PREFIX = 'sportspredict_v1_';

export const PredictionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Determine URL path or query parameter for separate apps
  // Supports `/admin`, `?portal=admin`, `?app=admin`, or `#admin`
  const [activeApp, setActiveAppState] = useState<'user' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (search.includes('portal=user') || search.includes('app=user')) {
        return 'user';
      }
      if (
        pathname.includes('/admin') ||
        search.includes('portal=admin') ||
        search.includes('app=admin') ||
        hash.includes('admin')
      ) {
        return 'admin';
      }
    }
    // Default to admin portal as requested
    return 'admin';
  });

  const setActiveApp = (app: 'user' | 'admin') => {
    sound.playClick();
    setActiveAppState(app);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (app === 'admin') {
        url.searchParams.set('portal', 'admin');
        url.searchParams.delete('app');
      } else {
        url.searchParams.set('portal', 'user');
        url.searchParams.delete('app');
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (
        pathname.includes('/admin') ||
        search.includes('portal=admin') ||
        search.includes('app=admin') ||
        hash.includes('admin')
      ) {
        setActiveAppState('admin');
      } else {
        setActiveAppState('user');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Master Admin Account credentials (persisted across password changes)
  const [adminAccount, setAdminAccount] = useState<AdminAccount>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}admin_account`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_ADMIN;
  });

  // Admin session (auto-authenticate with adminAccount by default so panel is immediately ready)
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}current_admin`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return adminAccount;
  });

  // User session (auto-authenticate with INITIAL_USERS[0] by default for instant preview)
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}current_user`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_USERS[0] || null;
  });

  // Core Data Collections
  const [users, setUsers] = useState<PlatformUser[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}users`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_USERS;
  });

  const [markets, setMarkets] = useState<PredictionMarket[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}markets`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_MARKETS;
  });

  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}predictions`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_PREDICTIONS;
  });

  const [transactions, setTransactions] = useState<CoinTransaction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}transactions`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [withdrawalRequests, setWithdrawalRequests] = useState<SimulatedWithdrawalRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}withdrawals`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_WITHDRAWALS;
  });

  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}announcements`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_ANNOUNCEMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}audit_logs`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}markets`, JSON.stringify(markets));
  }, [markets]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}predictions`, JSON.stringify(userPredictions));
  }, [userPredictions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}transactions`, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}withdrawals`, JSON.stringify(withdrawalRequests));
  }, [withdrawalRequests]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}announcements`, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}audit_logs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentAdmin) {
      localStorage.setItem(`${STORAGE_PREFIX}current_admin`, JSON.stringify(currentAdmin));
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}current_admin`);
    }
  }, [currentAdmin]);

  // Keep currentUser synced if user record in `users` changes
  useEffect(() => {
    if (currentUser) {
      const fresh = users.find((u) => u.id === currentUser.id);
      if (fresh && (fresh.coinBalance !== currentUser.coinBalance || fresh.status !== currentUser.status)) {
        setCurrentUser(fresh);
      }
    }
  }, [users]);

  // ================= ADMIN AUTH =================
  const adminLogin = (username: string, pass: string) => {
    if (username.trim().toLowerCase() === adminAccount.username.toLowerCase() && pass === adminAccount.passwordHash) {
      sound.playSuccess();
      setCurrentAdmin(adminAccount);
      return { success: true };
    }
    sound.playWarning();
    return { success: false, error: 'Invalid admin credentials. Please recheck username and password.' };
  };

  const adminLogout = () => {
    sound.playClick();
    setCurrentAdmin(null);
  };

  const adminChangePassword = (oldPass: string, newPass: string) => {
    if (!currentAdmin) return { success: false, error: 'Administrator session not authenticated.' };
    if (currentAdmin.passwordHash !== oldPass) {
      sound.playWarning();
      return { success: false, error: 'Current admin password does not match.' };
    }
    if (!newPass || newPass.trim().length < 4) {
      sound.playWarning();
      return { success: false, error: 'New password must be at least 4 characters.' };
    }
    if (oldPass === newPass) {
      sound.playWarning();
      return { success: false, error: 'New password must be different from current password.' };
    }

    sound.playSuccess();
    const updated: AdminAccount = {
      ...currentAdmin,
      passwordHash: newPass.trim(),
    };

    setAdminAccount(updated);
    setCurrentAdmin(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}admin_account`, JSON.stringify(updated));
      localStorage.setItem(`${STORAGE_PREFIX}current_admin`, JSON.stringify(updated));
    }

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: updated.username,
      action: 'ADMIN_PASSWORD_CHANGED',
      details: `Administrator @${updated.username} updated master root password.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  // ================= USER AUTH =================
  const userLogin = (username: string, pass: string) => {
    const cleanUser = username.trim().toLowerCase();
    const found = users.find((u) => u.username.toLowerCase() === cleanUser);
    
    if (!found) {
      sound.playWarning();
      return { success: false, error: 'User account not found. Credentials must be assigned by the Administrator.' };
    }

    if (found.passwordHash !== pass) {
      sound.playWarning();
      return { success: false, error: 'Incorrect password entered. Please contact Administrator if forgotten.' };
    }

    if (found.status === 'blocked') {
      sound.playWarning();
      return { success: false, error: 'This account has been BLOCKED by compliance. Access prohibited.' };
    }

    if (found.status === 'suspended') {
      sound.playWarning();
      return { success: false, error: 'This account is temporarily SUSPENDED. Please contact Administrator.' };
    }

    sound.playSuccess();
    const updatedUser = { ...found, lastLoginAt: new Date().toISOString() };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === found.id ? updatedUser : u)));
    return { success: true };
  };

  const userLogout = () => {
    sound.playClick();
    setCurrentUser(null);
  };

  const userChangePassword = (oldPass: string, newPass: string) => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    if (currentUser.passwordHash !== oldPass) {
      sound.playWarning();
      return { success: false, error: 'Existing password does not match.' };
    }
    if (!newPass || newPass.trim().length < 4) {
      sound.playWarning();
      return { success: false, error: 'New password must be at least 4 characters.' };
    }
    if (oldPass === newPass) {
      sound.playWarning();
      return { success: false, error: 'New password must be different from current password.' };
    }

    sound.playSuccess();
    const updated = { ...currentUser, passwordHash: newPass.trim() };
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Security Engine',
      action: 'USER_PASSWORD_CHANGED',
      targetId: currentUser.id,
      details: `User @${currentUser.username} updated their security password.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  // ================= USER PREDICTION ACTIONS =================
  const placePrediction = ({
    marketId,
    choice,
    coins,
  }: {
    marketId: string;
    choice: PredictionChoice;
    coins: number;
  }) => {
    if (!currentUser) return { success: false, error: 'Please log in to place predictions.' };
    if (currentUser.status !== 'active') return { success: false, error: 'Your account is restricted from predictions.' };

    const market = markets.find((m) => m.id === marketId);
    if (!market) return { success: false, error: 'Prediction market not found.' };

    if (market.status !== 'open') {
      return { success: false, error: 'This prediction market is closed or already resolved.' };
    }

    if (new Date() >= new Date(market.closingTime)) {
      return { success: false, error: 'Prediction window has closed for this event.' };
    }

    if (coins < market.minBet) {
      return { success: false, error: `Minimum prediction stake is ${market.minBet} virtual coins.` };
    }

    if (coins > market.maxBet) {
      return { success: false, error: `Maximum prediction stake is ${market.maxBet} virtual coins.` };
    }

    if (coins > currentUser.coinBalance) {
      sound.playWarning();
      return {
        success: false,
        error: `Insufficient virtual coins. Your current balance is ${currentUser.coinBalance.toLocaleString()} coins.`,
      };
    }

    sound.playSuccess();
    const odds = choice === 'YES' ? market.yesOdds : market.noOdds;
    const potentialPayout = Math.round(coins * odds);
    const nowIso = new Date().toISOString();

    const newPredId = `pred_${Date.now().toString().slice(-6)}`;
    const newPrediction: UserPrediction = {
      id: newPredId,
      userId: currentUser.id,
      username: currentUser.username,
      marketId: market.id,
      marketTitle: market.title,
      category: market.category,
      matchEvent: market.matchEvent,
      choice,
      coinsStaked: coins,
      oddsAtBet: odds,
      potentialPayout,
      status: 'pending',
      placedAt: nowIso,
    };

    // Deduct coins from user
    const newBalance = currentUser.coinBalance - coins;
    const updatedUser: PlatformUser = { ...currentUser, coinBalance: newBalance };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));

    // Update Market pool
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id === marketId) {
          return {
            ...m,
            totalYesCoins: choice === 'YES' ? m.totalYesCoins + coins : m.totalYesCoins,
            totalNoCoins: choice === 'NO' ? m.totalNoCoins + coins : m.totalNoCoins,
            totalParticipants: m.totalParticipants + 1,
          };
        }
        return m;
      })
    );

    // Save Prediction
    setUserPredictions((prev) => [newPrediction, ...prev]);

    // Create Coin Transaction
    const newTx: CoinTransaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      username: currentUser.username,
      type: 'prediction_stake',
      amount: coins,
      previousBalance: currentUser.coinBalance,
      newBalance,
      reason: `Staked ${choice} @ ${odds.toFixed(2)}x on "${market.title}"`,
      performedBy: currentUser.username,
      timestamp: nowIso,
      marketId: market.id,
    };
    setTransactions((prev) => [newTx, ...prev]);

    return { success: true };
  };

  const requestSimulatedWithdrawal = (coins: number, destination: string) => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    if (coins <= 0) return { success: false, error: 'Please enter a valid coin amount.' };
    if (!destination.trim()) return { success: false, error: 'Please enter a destination virtual vault or ID.' };

    if (coins > currentUser.coinBalance) {
      sound.playWarning();
      return { success: false, error: 'Cannot request more coins than your current balance.' };
    }

    sound.playSuccess();
    const nowIso = new Date().toISOString();
    const reqId = `wreq_${Date.now().toString().slice(-6)}`;

    // Deduct from balance and put in simulated escrow
    const newBalance = currentUser.coinBalance - coins;
    const updatedUser = { ...currentUser, coinBalance: newBalance };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));

    const newReq: SimulatedWithdrawalRequest = {
      id: reqId,
      userId: currentUser.id,
      username: currentUser.username,
      coinAmount: coins,
      destinationDetails: destination.trim(),
      status: 'pending',
      requestedAt: nowIso,
    };
    setWithdrawalRequests((prev) => [newReq, ...prev]);

    const newTx: CoinTransaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      username: currentUser.username,
      type: 'simulated_withdrawal',
      amount: coins,
      previousBalance: currentUser.coinBalance,
      newBalance,
      reason: `Simulated withdrawal request to ${destination.trim()}`,
      performedBy: currentUser.username,
      timestamp: nowIso,
      withdrawalRequestId: reqId,
    };
    setTransactions((prev) => [newTx, ...prev]);

    return { success: true };
  };

  // ================= ADMIN ACTIONS =================
  const adminCreateUser = ({
    username,
    password,
    displayName,
    initialCoins = 0, // Default 0 coins per instructions!
    notes = '',
  }: {
    username: string;
    password: string;
    displayName: string;
    initialCoins?: number;
    notes?: string;
  }) => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      sound.playWarning();
      return { success: false, error: `Username "${cleanUser}" is already taken. Please choose another.` };
    }

    sound.playSuccess();
    const newId = `usr_${cleanUser}_${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const newUser: PlatformUser = {
      id: newId,
      username: cleanUser,
      passwordHash: password,
      displayName: displayName.trim() || cleanUser,
      coinBalance: Math.max(0, initialCoins),
      status: 'active',
      notes,
      createdAt: nowIso,
    };

    setUsers((prev) => [newUser, ...prev]);

    // Audit log
    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: 'CREATE_USER',
      targetId: newId,
      details: `Created user "${cleanUser}" with ${newUser.coinBalance} virtual coins.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    if (newUser.coinBalance > 0) {
      const tx: CoinTransaction = {
        id: `tx_${Date.now()}`,
        userId: newId,
        username: cleanUser,
        type: 'admin_credit',
        amount: newUser.coinBalance,
        previousBalance: 0,
        newBalance: newUser.coinBalance,
        reason: 'Initial coin provisioning upon account creation',
        performedBy: currentAdmin?.username || 'admin',
        timestamp: nowIso,
      };
      setTransactions((prev) => [tx, ...prev]);
    }

    return { success: true, user: newUser };
  };

  const adminUpdateUserStatus = (userId: string, status: 'active' | 'suspended' | 'blocked', reason: string) => {
    sound.playWarning();
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const nowIso = new Date().toISOString();
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: `SET_STATUS_${status.toUpperCase()}`,
      targetId: userId,
      details: `Changed status for ${target.username} to ${status.toUpperCase()}. Reason: ${reason || 'Administrative action'}`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);
  };

  const adminResetUserPassword = (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };

    sound.playSuccess();
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, passwordHash: newPassword } : u))
    );

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: currentAdmin?.username || 'admin',
      action: 'RESET_PASSWORD',
      targetId: userId,
      details: `Admin reset password for user ${target.username}.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  const adminAdjustCoins = ({
    userId,
    type,
    amount,
    reason,
  }: {
    userId: string;
    type: 'admin_credit' | 'admin_debit' | 'set_balance';
    amount: number;
    reason: string;
  }) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };
    if (!reason || reason.trim().length < 3) {
      return { success: false, error: 'A valid audit reason is required for coin modifications.' };
    }

    const prevCoins = target.coinBalance;
    let newCoins = prevCoins;

    if (type === 'admin_credit') {
      if (amount <= 0) return { success: false, error: 'Credit amount must be greater than 0.' };
      newCoins = prevCoins + amount;
    } else if (type === 'admin_debit') {
      if (amount <= 0) return { success: false, error: 'Debit amount must be greater than 0.' };
      if (prevCoins - amount < 0) {
        return { success: false, error: `Cannot deduct ${amount} coins. User only has ${prevCoins} coins.` };
      }
      newCoins = prevCoins - amount;
    } else if (type === 'set_balance') {
      if (amount < 0) return { success: false, error: 'Coins cannot be negative.' };
      newCoins = amount;
    }

    sound.playSuccess();
    const nowIso = new Date().toISOString();

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, coinBalance: newCoins } : u))
    );

    const newTx: CoinTransaction = {
      id: `tx_${Date.now().toString().slice(-6)}`,
      userId,
      username: target.username,
      type: type === 'admin_debit' ? 'admin_debit' : 'admin_credit',
      amount: Math.abs(newCoins - prevCoins),
      previousBalance: prevCoins,
      newBalance: newCoins,
      reason: reason.trim(),
      performedBy: currentAdmin?.username || 'admin',
      timestamp: nowIso,
    };
    setTransactions((prev) => [newTx, ...prev]);

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: 'ADJUST_COINS',
      targetId: userId,
      details: `${type.toUpperCase()} for ${target.username}: Previous ${prevCoins} -> New ${newCoins} coins. Reason: ${reason}`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  const adminDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };

    sound.playWarning();
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setUserPredictions((prev) => prev.filter((p) => p.userId !== userId));
    setWithdrawalRequests((prev) => prev.filter((w) => w.userId !== userId));

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: currentAdmin?.username || 'admin',
      action: 'DELETE_USER',
      targetId: userId,
      details: `Permanently deleted user account "${target.username}" and associated active records.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  // ================= MARKET MANAGEMENT =================
  const adminCreateMarket = (data: Omit<PredictionMarket, 'id' | 'totalYesCoins' | 'totalNoCoins' | 'totalParticipants' | 'createdAt'>) => {
    if (!data.title.trim() || !data.matchEvent.trim()) {
      return { success: false, error: 'Market question title and event details are required.' };
    }
    if (data.yesOdds <= 1.0 || data.noOdds <= 1.0) {
      return { success: false, error: 'Odds must be greater than 1.00.' };
    }

    sound.playSuccess();
    const newId = `mkt_${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const newMarket: PredictionMarket = {
      ...data,
      id: newId,
      totalYesCoins: 0,
      totalNoCoins: 0,
      totalParticipants: 0,
      createdAt: nowIso,
    };

    setMarkets((prev) => [newMarket, ...prev]);

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: 'CREATE_MARKET',
      targetId: newId,
      details: `Created sports market: "${data.title}" (YES: ${data.yesOdds.toFixed(2)}x, NO: ${data.noOdds.toFixed(2)}x)`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  const adminUpdateMarketOdds = (marketId: string, yesOdds: number, noOdds: number) => {
    if (yesOdds <= 1.0 || noOdds <= 1.0) {
      return { success: false, error: 'Odds must be greater than 1.00.' };
    }
    const market = markets.find((m) => m.id === marketId);
    if (!market) return { success: false, error: 'Market not found.' };

    sound.playClick();
    setMarkets((prev) =>
      prev.map((m) => (m.id === marketId ? { ...m, yesOdds, noOdds } : m))
    );

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: currentAdmin?.username || 'admin',
      action: 'UPDATE_ODDS',
      targetId: marketId,
      details: `Updated odds for "${market.title}": YES -> ${yesOdds.toFixed(2)}x, NO -> ${noOdds.toFixed(2)}x`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  const adminUpdateMarketStatus = (marketId: string, status: 'open' | 'closed' | 'cancelled') => {
    sound.playWarning();
    const market = markets.find((m) => m.id === marketId);
    if (!market) return;

    const nowIso = new Date().toISOString();
    setMarkets((prev) =>
      prev.map((m) => (m.id === marketId ? { ...m, status } : m))
    );

    // If cancelled, refund all pending bets to users!
    if (status === 'cancelled') {
      const relatedBets = userPredictions.filter((p) => p.marketId === marketId && p.status === 'pending');
      relatedBets.forEach((bet) => {
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === bet.userId) {
              return { ...u, coinBalance: u.coinBalance + bet.coinsStaked };
            }
            return u;
          })
        );

        setUserPredictions((prevBets) =>
          prevBets.map((p) => (p.id === bet.id ? { ...p, status: 'refunded' } : p))
        );

        const refundTx: CoinTransaction = {
          id: `tx_${Date.now()}_${Math.floor(Math.random() * 999)}`,
          userId: bet.userId,
          username: bet.username,
          type: 'prediction_refund',
          amount: bet.coinsStaked,
          previousBalance: 0,
          newBalance: 0,
          reason: `Market "${market.title}" cancelled by Admin. Full stake refunded.`,
          performedBy: currentAdmin?.username || 'admin',
          timestamp: nowIso,
          marketId,
        };
        setTransactions((prev) => [refundTx, ...prev]);
      });
    }

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: `SET_MARKET_${status.toUpperCase()}`,
      targetId: marketId,
      details: `Market "${market.title}" status changed to ${status.toUpperCase()}.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);
  };

  const adminResolveMarket = (marketId: string, winningOutcome: PredictionChoice, notes: string) => {
    const market = markets.find((m) => m.id === marketId);
    if (!market) return { success: false, error: 'Market not found.' };
    if (market.status === 'settled') return { success: false, error: 'Market is already settled.' };

    sound.playSuccess();
    const nowIso = new Date().toISOString();

    // 1. Mark market as settled
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId
          ? {
              ...m,
              status: 'settled',
              resolvedOutcome: winningOutcome,
              settledAt: nowIso,
              settledBy: currentAdmin?.username || 'admin',
              resolutionNotes: notes.trim(),
            }
          : m
      )
    );

    // 2. Settle all user predictions for this market
    const pendingBets = userPredictions.filter((p) => p.marketId === marketId && p.status === 'pending');

    pendingBets.forEach((bet) => {
      const won = bet.choice === winningOutcome;
      const payout = won ? bet.potentialPayout : 0;

      // Update prediction status
      setUserPredictions((prev) =>
        prev.map((p) =>
          p.id === bet.id
            ? {
                ...p,
                status: won ? 'won' : 'lost',
                actualPayout: payout,
                settledAt: nowIso,
              }
            : p
        )
      );

      // Credit winner
      if (won) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === bet.userId) {
              const newBal = u.coinBalance + payout;
              const winTx: CoinTransaction = {
                id: `tx_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
                userId: u.id,
                username: u.username,
                type: 'prediction_win',
                amount: payout,
                previousBalance: u.coinBalance,
                newBalance: newBal,
                reason: `Won prediction on "${market.title}" (${winningOutcome} @ ${bet.oddsAtBet.toFixed(2)}x)`,
                performedBy: 'System Engine',
                timestamp: nowIso,
                marketId,
              };
              setTransactions((prevTx) => [winTx, ...prevTx]);
              return { ...u, coinBalance: newBal };
            }
            return u;
          })
        );
      }
    });

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: 'RESOLVE_MARKET',
      targetId: marketId,
      details: `Settled market "${market.title}" as ${winningOutcome}. Notes: ${notes}. Distributed winning coins to all matching predictions.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  const adminDeleteMarket = (marketId: string) => {
    sound.playWarning();
    setMarkets((prev) => prev.filter((m) => m.id !== marketId));
    return { success: true };
  };

  // ================= SIMULATED WITHDRAWAL RESOLUTION =================
  const adminApproveWithdrawal = (requestId: string) => {
    const req = withdrawalRequests.find((w) => w.id === requestId);
    if (!req) return { success: false, error: 'Request not found.' };

    sound.playSuccess();
    const nowIso = new Date().toISOString();

    setWithdrawalRequests((prev) =>
      prev.map((w) =>
        w.id === requestId
          ? {
              ...w,
              status: 'approved',
              processedAt: nowIso,
              processedBy: currentAdmin?.username || 'admin',
            }
          : w
      )
    );

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: 'APPROVE_SIMULATED_WITHDRAWAL',
      targetId: requestId,
      details: `Approved simulated withdrawal of ${req.coinAmount} coins for ${req.username}.`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  const adminRejectWithdrawal = (requestId: string, reason: string) => {
    const req = withdrawalRequests.find((w) => w.id === requestId);
    if (!req) return { success: false, error: 'Request not found.' };

    sound.playWarning();
    const nowIso = new Date().toISOString();

    // Refund coins back to user
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === req.userId) {
          const newBal = u.coinBalance + req.coinAmount;
          const refundTx: CoinTransaction = {
            id: `tx_${Date.now()}`,
            userId: u.id,
            username: u.username,
            type: 'admin_credit',
            amount: req.coinAmount,
            previousBalance: u.coinBalance,
            newBalance: newBal,
            reason: `Refund: Simulated withdrawal rejected (${reason || 'Administrative action'})`,
            performedBy: currentAdmin?.username || 'admin',
            timestamp: nowIso,
            withdrawalRequestId: requestId,
          };
          setTransactions((prevTx) => [refundTx, ...prevTx]);
          return { ...u, coinBalance: newBal };
        }
        return u;
      })
    );

    setWithdrawalRequests((prev) =>
      prev.map((w) =>
        w.id === requestId
          ? {
              ...w,
              status: 'rejected',
              rejectionReason: reason || 'Rejected by Administrator',
              processedAt: nowIso,
              processedBy: currentAdmin?.username || 'admin',
            }
          : w
      )
    );

    const logItem: PlatformAuditLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: currentAdmin?.username || 'admin',
      action: 'REJECT_SIMULATED_WITHDRAWAL',
      targetId: requestId,
      details: `Rejected simulated withdrawal of ${req.coinAmount} coins for ${req.username}. Coins refunded to user. Reason: ${reason}`,
    };
    setAuditLogs((prev) => [logItem, ...prev]);

    return { success: true };
  };

  // ================= ANNOUNCEMENTS & UTILITIES =================
  const adminCreateAnnouncement = (title: string, content: string, priority: 'normal' | 'high' | 'urgent') => {
    sound.playSuccess();
    const newAnc: PlatformAnnouncement = {
      id: `anc_${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      content: content.trim(),
      priority,
      createdAt: new Date().toISOString(),
      active: true,
    };
    setAnnouncements((prev) => [newAnc, ...prev]);
  };

  const adminDeleteAnnouncement = (id: string) => {
    sound.playClick();
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const resetAllPlatformData = () => {
    sound.playWarning();
    setUsers(INITIAL_USERS);
    setMarkets(INITIAL_MARKETS);
    setUserPredictions(INITIAL_PREDICTIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setWithdrawalRequests(INITIAL_WITHDRAWALS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(null);
    setCurrentAdmin(null);
    localStorage.clear();
  };

  return (
    <PredictionContext.Provider
      value={{
        activeApp,
        setActiveApp,
        currentAdmin,
        currentUser,
        adminLogin,
        adminLogout,
        adminChangePassword,
        userLogin,
        userLogout,
        userChangePassword,
        users,
        markets,
        userPredictions,
        transactions,
        withdrawalRequests,
        announcements,
        auditLogs,
        placePrediction,
        requestSimulatedWithdrawal,
        adminCreateUser,
        adminUpdateUserStatus,
        adminResetUserPassword,
        adminAdjustCoins,
        adminDeleteUser,
        adminCreateMarket,
        adminUpdateMarketOdds,
        adminUpdateMarketStatus,
        adminResolveMarket,
        adminDeleteMarket,
        adminApproveWithdrawal,
        adminRejectWithdrawal,
        adminCreateAnnouncement,
        adminDeleteAnnouncement,
        resetAllPlatformData,
      }}
    >
      {children}
    </PredictionContext.Provider>
  );
};

export const usePrediction = (): PredictionContextType => {
  const context = useContext(PredictionContext);
  if (!context) {
    throw new Error('usePrediction must be used within PredictionProvider');
  }
  return context;
};
