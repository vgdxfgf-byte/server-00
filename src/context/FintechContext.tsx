import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  WithdrawalRequest,
  FeeConfiguration,
  AdminLog,
  PaymentMethodType,
  BankBeneficiary,
  UpiBeneficiary,
  TransactionStatus,
  BalanceAdjustment,
  NotificationItem,
  SystemConfig,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_WITHDRAWALS,
  INITIAL_FEE_CONFIG,
  INITIAL_ADMIN_LOGS,
  INITIAL_ADJUSTMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SYSTEM_CONFIG,
} from '../data/initialData';
import { sound } from '../utils/audio';

interface CalculateFeeResult {
  feeAmount: number;
  gstAmount: number;
  totalDeductions: number;
  netPayableAmount: number;
}

interface FintechContextType {
  currentUser: User;
  users: User[];
  withdrawals: WithdrawalRequest[];
  feeConfig: FeeConfiguration;
  adminLogs: AdminLog[];
  adjustments: BalanceAdjustment[];
  notifications: NotificationItem[];
  systemConfig: SystemConfig;
  currentRole: 'user' | 'admin';
  theme: 'dark' | 'light';
  adminAuthenticated: boolean;
  setAdminAuthenticated: (val: boolean) => void;
  toggleTheme: () => void;
  switchRole: (role: 'user' | 'admin') => void;
  switchUser: (userId: string) => void;
  calculateFee: (amount: number) => CalculateFeeResult;
  requestWithdrawal: (params: {
    amount: number;
    paymentMethod: PaymentMethodType;
    paymentDetails: WithdrawalRequest['paymentDetails'];
  }) => {
    success: boolean;
    error?: string;
    request?: WithdrawalRequest;
    otpCode?: string;
  };
  verifyOtpAndSubmit: (
    requestId: string,
    enteredOtp: string,
    expectedOtp: string
  ) => { success: boolean; error?: string };
  depositFunds: (amount: number, method: 'UPI' | 'NetBanking' | 'DebitCard') => void;
  
  // Super Admin Withdrawal Actions
  adminApproveRequest: (requestId: string) => void;
  adminMarkProcessing: (requestId: string, utrNumber?: string) => void;
  adminMarkCompleted: (requestId: string, utrNumber: string) => void;
  adminRejectRequest: (requestId: string, reason: string) => void;
  deleteTransaction: (requestId: string, refundIfPending?: boolean) => { success: boolean; error?: string };

  // Dedicated Balance Management
  adjustUserBalance: (params: {
    userId: string;
    type: 'increase' | 'decrease' | 'set_fixed';
    targetFund?: 'availableBalance' | 'dailyWithdrawalLimit' | 'withdrawnToday' | 'pendingWithdrawals' | 'totalWithdrawn';
    amount: number;
    reason: string;
  }) => { success: boolean; error?: string; adjustment?: BalanceAdjustment };

  // Configuration & Security
  updateFeeConfig: (newConfig: Partial<FeeConfiguration>) => void;
  toggleWithdrawalsEnabled: (enabled?: boolean, notice?: string) => void;
  togglePaymentMethod: (id: string) => void;
  toggleUserFrozenState: (userId: string) => void;
  deleteUser: (userId: string) => { success: boolean; error?: string };
  updateUserProfile: (userId: string, updates: Partial<User>) => void;
  registerNewUser: (name: string, email: string, phone: string) => { success: boolean; error?: string; user?: User };

  // Beneficiaries
  addBankBeneficiary: (beneficiary: Omit<BankBeneficiary, 'id'>) => void;
  addUpiBeneficiary: (beneficiary: Omit<UpiBeneficiary, 'id'>) => void;
  deletePayoutAccount: (userId: string, accountType: 'bank' | 'upi', accountId: string, reason?: string) => { success: boolean; error?: string };

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  clearAllNotifications: (userId: string) => void;

  // Utilities
  resetToDefault: () => void;
}

const FintechContext = createContext<FintechContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'payflow_storage_v2_';

export const FintechProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}theme`);
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark'; // modern dark fintech default
    }
    return 'dark';
  });

  // Current active role
  const [currentRole, setCurrentRole] = useState<'user' | 'admin'>('user');
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(true); // default true for preview ease, can lock/unlock

  // Core application state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        return parsed.map((u) => ({
          ...u,
          dailyWithdrawalLimit: Math.max(u.dailyWithdrawalLimit || 0, 500000),
        }));
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>('usr_vikram_89');

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}withdrawals`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_WITHDRAWALS;
      }
    }
    return INITIAL_WITHDRAWALS;
  });

  const [feeConfig, setFeeConfig] = useState<FeeConfiguration>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}feeConfig`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new 5 Lakhs limit applies even with previous cached data
        return {
          ...INITIAL_FEE_CONFIG,
          ...parsed,
          maxWithdrawalAmountPerTxn: Math.max(parsed.maxWithdrawalAmountPerTxn || 0, 500000),
          dailyCeilingLimit: Math.max(parsed.dailyCeilingLimit || 0, 500000),
        };
      } catch {
        return INITIAL_FEE_CONFIG;
      }
    }
    return INITIAL_FEE_CONFIG;
  });

  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}adjustments`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ADJUSTMENTS;
      }
    }
    return INITIAL_ADJUSTMENTS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}systemConfig`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_SYSTEM_CONFIG;
      }
    }
    return INITIAL_SYSTEM_CONFIG;
  });

  const [adminLogs, setAdminLogs] = useState<AdminLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}adminLogs`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ADMIN_LOGS;
      }
    }
    return INITIAL_ADMIN_LOGS;
  });

  // Keep DOM theme updated
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}theme`, theme);
  }, [theme]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}withdrawals`, JSON.stringify(withdrawals));
  }, [withdrawals]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}feeConfig`, JSON.stringify(feeConfig));
  }, [feeConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}adjustments`, JSON.stringify(adjustments));
  }, [adjustments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}systemConfig`, JSON.stringify(systemConfig));
  }, [systemConfig]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}adminLogs`, JSON.stringify(adminLogs));
  }, [adminLogs]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const toggleTheme = () => {
    sound.playClick();
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const switchRole = (role: 'user' | 'admin') => {
    sound.playClick();
    setCurrentRole(role);
    if (role === 'admin') {
      const adminUser = users.find((u) => u.role === 'admin');
      if (adminUser) setCurrentUserId(adminUser.id);
    } else {
      const normalUser = users.find((u) => u.role === 'user');
      if (normalUser) setCurrentUserId(normalUser.id);
    }
  };

  const switchUser = (userId: string) => {
    sound.playClick();
    setCurrentUserId(userId);
  };

  // Dispatch in-app notification helper
  const sendNotification = (
    userId: string,
    title: string,
    message: string,
    type: 'withdrawal' | 'balance' | 'security' | 'system',
    linkTxnId?: string
  ) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      linkTxnId,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Fee Calculation Engine
  const calculateFee = (amount: number): CalculateFeeResult => {
    if (!amount || amount <= 0) {
      return { feeAmount: 0, gstAmount: 0, totalDeductions: 0, netPayableAmount: 0 };
    }

    let fee = 0;
    if (feeConfig.feeType === 'flat') {
      fee = feeConfig.flatFee;
    } else if (feeConfig.feeType === 'percentage') {
      fee = (amount * feeConfig.percentageFee) / 100;
    } else if (feeConfig.feeType === 'flat_plus_percent') {
      fee = feeConfig.flatFee + (amount * feeConfig.percentageFee) / 100;
    }

    fee = Math.round(fee * 100) / 100;
    const gst = Math.round(((fee * feeConfig.gstRatePercent) / 100) * 100) / 100;
    const totalDeductions = Math.round((fee + gst) * 100) / 100;
    const netPayable = Math.max(0, Math.round((amount - totalDeductions) * 100) / 100);

    return {
      feeAmount: fee,
      gstAmount: gst,
      totalDeductions,
      netPayableAmount: netPayable,
    };
  };

  // Request Withdrawal (Step 1 -> Creates pending request, reserves balance, issues 2FA OTP)
  const requestWithdrawal = ({
    amount,
    paymentMethod,
    paymentDetails,
  }: {
    amount: number;
    paymentMethod: PaymentMethodType;
    paymentDetails: WithdrawalRequest['paymentDetails'];
  }) => {
    if (!systemConfig.withdrawalsEnabled) {
      sound.playWarning();
      return {
        success: false,
        error:
          systemConfig.maintenanceNotice ||
          'Withdrawals are temporarily disabled for banking maintenance. Please try again shortly.',
      };
    }

    const methodConfig = systemConfig.paymentMethods.find((m) => m.type === paymentMethod);
    if (methodConfig && !methodConfig.enabled) {
      sound.playWarning();
      return {
        success: false,
        error: `${methodConfig.name} is currently disabled by treasury. Please select an alternate method.`,
      };
    }

    if (currentUser.isFrozen) {
      sound.playWarning();
      return { success: false, error: 'Your account is currently restricted. Please contact compliance.' };
    }

    if (amount < feeConfig.minWithdrawalAmount) {
      sound.playWarning();
      return {
        success: false,
        error: `Minimum withdrawal amount is ₹${feeConfig.minWithdrawalAmount.toLocaleString('en-IN')}.`,
      };
    }

    if (amount > feeConfig.maxWithdrawalAmountPerTxn) {
      sound.playWarning();
      return {
        success: false,
        error: `Maximum withdrawal per transaction is ₹${feeConfig.maxWithdrawalAmountPerTxn.toLocaleString('en-IN')}.`,
      };
    }

    if (amount > currentUser.availableBalance) {
      sound.playWarning();
      return {
        success: false,
        error: `Insufficient available balance. You have ₹${currentUser.availableBalance.toLocaleString('en-IN')}.`,
      };
    }

    if (currentUser.withdrawnToday + amount > currentUser.dailyWithdrawalLimit) {
      const remainingLimit = currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday;
      sound.playWarning();
      return {
        success: false,
        error: `Daily limit exceeded. Remaining daily quota is ₹${remainingLimit.toLocaleString('en-IN')}.`,
      };
    }

    const { feeAmount, gstAmount, netPayableAmount } = calculateFee(amount);

    if (netPayableAmount <= 0) {
      sound.playWarning();
      return {
        success: false,
        error: 'Net payable amount after applicable fees must be greater than ₹0.',
      };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const txnId = `TXN-${dateStr}-${randSuffix}`;
    const refNum = paymentMethod === 'upi' ? `REF-UP-${randSuffix}2` : `REF-IMPS-${randSuffix}9`;
    const nowIso = new Date().toISOString();

    const newRequest: WithdrawalRequest = {
      id: txnId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      amount,
      feeAmount,
      gstAmount,
      netPayableAmount,
      paymentMethod,
      paymentDetails,
      status: 'pending',
      referenceNumber: refNum,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusTimeline: [
        {
          status: 'pending',
          timestamp: nowIso,
          title: 'Withdrawal Initiated',
          description: `Withdrawal request for ₹${amount.toLocaleString('en-IN')} created via ${
            paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'
          }.`,
          actor: currentUser.name,
        },
      ],
    };

    // Deduct available balance and reserve into pendingWithdrawals
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            availableBalance: Math.round((u.availableBalance - amount) * 100) / 100,
            pendingWithdrawals: Math.round((u.pendingWithdrawals + amount) * 100) / 100,
            withdrawnToday: Math.round((u.withdrawnToday + amount) * 100) / 100,
          };
        }
        return u;
      })
    );

    setWithdrawals((prev) => [newRequest, ...prev]);

    return {
      success: true,
      request: newRequest,
      otpCode,
    };
  };

  // Verify OTP and advance transaction
  const verifyOtpAndSubmit = (requestId: string, enteredOtp: string, expectedOtp: string) => {
    if (enteredOtp.trim() !== expectedOtp.trim()) {
      sound.playWarning();
      return { success: false, error: 'Invalid 2FA OTP code. Please check and try again.' };
    }

    sound.playSuccess();
    const nowIso = new Date().toISOString();

    setWithdrawals((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'pending',
            updatedAt: nowIso,
            statusTimeline: [
              ...req.statusTimeline,
              {
                status: 'pending',
                timestamp: nowIso,
                title: '2FA OTP Verified',
                description: 'Customer authenticated via 6-digit secure SMS OTP. Request forwarded to Treasury queue.',
                actor: 'PayFlow Security Gateway',
              },
            ],
          };
        }
        return req;
      })
    );

    sendNotification(
      currentUser.id,
      'Withdrawal Request Submitted',
      `Your payout request ${requestId} for ₹${currentUser.availableBalance} has been authenticated with 2FA and queued for review.`,
      'withdrawal',
      requestId
    );

    return { success: true };
  };

  // Deposit funds
  const depositFunds = (amount: number, method: 'UPI' | 'NetBanking' | 'DebitCard') => {
    if (amount <= 0) return;
    sound.playSuccess();

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            availableBalance: Math.round((u.availableBalance + amount) * 100) / 100,
            totalDeposited: Math.round((u.totalDeposited + amount) * 100) / 100,
          };
        }
        return u;
      })
    );

    sendNotification(
      currentUser.id,
      'Deposit Successful',
      `₹${amount.toLocaleString('en-IN')} was successfully deposited into your wallet via ${method}.`,
      'balance'
    );

    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Payment Gateway (Auto)',
      action: 'DEPOSIT_SUCCESS',
      details: `User ${currentUser.name} deposited ₹${amount.toLocaleString('en-IN')} via ${method}. Instant settlement.`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // SUPER ADMIN ACTION 1: Approve Request (Moves from 'pending' to 'approved')
  const adminApproveRequest = (requestId: string) => {
    sound.playSuccess();
    const nowIso = new Date().toISOString();
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;

    setWithdrawals((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'approved',
            updatedAt: nowIso,
            statusTimeline: [
              ...req.statusTimeline,
              {
                status: 'approved',
                timestamp: nowIso,
                title: 'Withdrawal Approved by Compliance',
                description: 'Super Admin reviewed and approved the withdrawal request. Scheduled for banking gateway dispatch.',
                actor: 'Super Admin',
              },
            ],
          };
        }
        return req;
      })
    );

    sendNotification(
      targetReq.userId,
      'Withdrawal Approved',
      `Your withdrawal request ${targetReq.id} for ₹${targetReq.amount.toLocaleString(
        'en-IN'
      )} has been approved by Treasury and is ready for payment dispatch.`,
      'withdrawal',
      targetReq.id
    );

    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'APPROVE_WITHDRAWAL',
      targetId: requestId,
      details: `Approved withdrawal of ₹${targetReq.amount.toLocaleString('en-IN')} for ${targetReq.userName}. Status: APPROVED.`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // SUPER ADMIN ACTION 2: Mark Processing (Dispatches to banking rail)
  const adminMarkProcessing = (requestId: string, customUtr?: string) => {
    sound.playSuccess();
    const nowIso = new Date().toISOString();
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;

    const utr =
      customUtr?.trim() ||
      `UTR${new Date().getFullYear().toString().slice(2)}${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    setWithdrawals((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'processing',
            utrNumber: utr,
            updatedAt: nowIso,
            statusTimeline: [
              ...req.statusTimeline,
              {
                status: 'processing',
                timestamp: nowIso,
                title: 'Dispatched to Banking Network',
                description: `Dispatched to ${targetReq.paymentMethod === 'upi' ? 'NPCI UPI' : 'RBI IMPS'} network with reference ${utr}.`,
                actor: 'Super Admin & Gateway Engine',
              },
            ],
          };
        }
        return req;
      })
    );

    sendNotification(
      targetReq.userId,
      'Payout in Processing',
      `Your payout ${targetReq.id} is now processing in the banking rail with reference ${utr}.`,
      'withdrawal',
      targetReq.id
    );

    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'DISPATCH_PROCESSING',
      targetId: requestId,
      details: `Dispatched payout for ${targetReq.userName} (₹${targetReq.amount.toLocaleString('en-IN')}) to banking rails. Ref: ${utr}.`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // SUPER ADMIN ACTION 3: Mark Completed (Actual payment confirmed with UTR)
  const adminMarkCompleted = (requestId: string, utrNumber: string) => {
    sound.playSuccess();
    const nowIso = new Date().toISOString();
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;

    const finalUtr =
      utrNumber.trim() ||
      targetReq.utrNumber ||
      `UTR${new Date().getFullYear().toString().slice(2)}${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    setWithdrawals((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'completed',
            utrNumber: finalUtr,
            updatedAt: nowIso,
            completedAt: nowIso,
            statusTimeline: [
              ...req.statusTimeline,
              {
                status: 'completed',
                timestamp: nowIso,
                title: 'Payout Settled & Confirmed',
                description: `Bank transfer verified and confirmed by Treasury. UTR: ${finalUtr}.`,
                actor: 'Super Admin / Core Settlement Node',
              },
            ],
          };
        }
        return req;
      })
    );

    // Deduct from pendingWithdrawals and add to totalWithdrawn for the user
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === targetReq.userId) {
          return {
            ...u,
            pendingWithdrawals: Math.max(
              0,
              Math.round((u.pendingWithdrawals - targetReq.amount) * 100) / 100
            ),
            totalWithdrawn: Math.round((u.totalWithdrawn + targetReq.amount) * 100) / 100,
          };
        }
        return u;
      })
    );

    sendNotification(
      targetReq.userId,
      'Payout Settled & Completed',
      `₹${targetReq.netPayableAmount.toLocaleString('en-IN')} has been successfully transferred to your account. UTR: ${finalUtr}.`,
      'withdrawal',
      targetReq.id
    );

    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'SETTLE_COMPLETED',
      targetId: requestId,
      details: `Settled withdrawal of ₹${targetReq.amount.toLocaleString(
        'en-IN'
      )} for ${targetReq.userName}. Bank UTR: ${finalUtr}.`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // SUPER ADMIN ACTION 4: Reject Request (Reverses funds back to available balance)
  const adminRejectRequest = (requestId: string, reason: string) => {
    sound.playWarning();
    const nowIso = new Date().toISOString();
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;

    setWithdrawals((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          return {
            ...req,
            status: 'rejected',
            rejectionReason: reason,
            updatedAt: nowIso,
            statusTimeline: [
              ...req.statusTimeline,
              {
                status: 'rejected',
                timestamp: nowIso,
                title: 'Withdrawal Rejected & Refunded',
                description: `Reason: ${reason}. Full ₹${targetReq.amount.toLocaleString(
                  'en-IN'
                )} restored to user available balance.`,
                actor: 'Super Admin / Compliance',
              },
            ],
          };
        }
        return req;
      })
    );

    // Reverse reserved funds back into user available balance
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === targetReq.userId) {
          return {
            ...u,
            availableBalance: Math.round((u.availableBalance + targetReq.amount) * 100) / 100,
            pendingWithdrawals: Math.max(
              0,
              Math.round((u.pendingWithdrawals - targetReq.amount) * 100) / 100
            ),
            withdrawnToday: Math.max(
              0,
              Math.round((u.withdrawnToday - targetReq.amount) * 100) / 100
            ),
          };
        }
        return u;
      })
    );

    sendNotification(
      targetReq.userId,
      'Withdrawal Rejected & Refunded',
      `Your request ${targetReq.id} for ₹${targetReq.amount.toLocaleString(
        'en-IN'
      )} was rejected (${reason}). The full amount has been refunded to your wallet.`,
      'withdrawal',
      targetReq.id
    );

    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'REJECT_WITHDRAWAL',
      targetId: requestId,
      details: `Rejected withdrawal of ₹${targetReq.amount.toLocaleString(
        'en-IN'
      )}. Reason: "${reason}". Full amount refunded to user.`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // SUPER ADMIN ACTION 5: Delete Transaction History Record
  const deleteTransaction = (requestId: string, refundIfPending: boolean = true) => {
    sound.playWarning();
    const target = withdrawals.find((w) => w.id === requestId);
    if (!target) {
      return { success: false, error: 'Transaction record not found.' };
    }

    const nowIso = new Date().toISOString();

    // If transaction was in pending/approved/processing state and refund is requested,
    // restore the reserved funds back to user's available balance and deduct from pending
    if (refundIfPending && (target.status === 'pending' || target.status === 'approved' || target.status === 'processing')) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === target.userId) {
            return {
              ...u,
              availableBalance: Math.round((u.availableBalance + target.amount) * 100) / 100,
              pendingWithdrawals: Math.max(
                0,
                Math.round((u.pendingWithdrawals - target.amount) * 100) / 100
              ),
              withdrawnToday: Math.max(
                0,
                Math.round((u.withdrawnToday - target.amount) * 100) / 100
              ),
            };
          }
          return u;
        })
      );
    } else if (target.status === 'completed') {
      // Completed payout deleted from records - decrement user's totalWithdrawn metric
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === target.userId) {
            return {
              ...u,
              totalWithdrawn: Math.max(
                0,
                Math.round((u.totalWithdrawn - target.amount) * 100) / 100
              ),
            };
          }
          return u;
        })
      );
    }

    // Remove transaction record
    setWithdrawals((prev) => prev.filter((w) => w.id !== requestId));

    // Remove any related notification links
    setNotifications((prev) => prev.filter((n) => n.linkTxnId !== requestId));

    // Immutable administrative audit log entry
    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'DELETE_TRANSACTION_HISTORY',
      targetId: requestId,
      details: `Permanently deleted transaction ${requestId} (${target.status.toUpperCase()}, ₹${target.amount.toLocaleString(
        'en-IN'
      )}) for user ${target.userName} (${target.userId}). ${
        target.status === 'pending' || target.status === 'approved' || target.status === 'processing'
          ? `₹${target.amount.toLocaleString('en-IN')} reserved funds reversed to user balance.`
          : 'Historical ledger record purged.'
      }`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);

    return { success: true };
  };

  // SUPER ADMIN REQUIREMENT 3: Dedicated Funds & Balance Management
  const adjustUserBalance = ({
    userId,
    type,
    targetFund = 'availableBalance',
    amount,
    reason,
  }: {
    userId: string;
    type: 'increase' | 'decrease' | 'set_fixed';
    targetFund?: 'availableBalance' | 'dailyWithdrawalLimit' | 'withdrawnToday' | 'pendingWithdrawals' | 'totalWithdrawn';
    amount: number;
    reason: string;
  }) => {
    if (!reason || reason.trim().length < 5) {
      sound.playWarning();
      return { success: false, error: 'A mandatory audit reason (minimum 5 characters) is required for all fund adjustments.' };
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      sound.playWarning();
      return { success: false, error: 'Target user not found.' };
    }

    const prevBal = targetUser[targetFund] ?? 0;
    let newBal = prevBal;
    let delta = amount;

    if (type === 'increase') {
      if (amount <= 0) return { success: false, error: 'Increase amount must be greater than 0.' };
      newBal = Math.round((prevBal + amount) * 100) / 100;
    } else if (type === 'decrease') {
      if (amount <= 0) return { success: false, error: 'Decrease amount must be greater than 0.' };
      if (prevBal - amount < 0) {
        sound.playWarning();
        return { success: false, error: `Cannot deduct ₹${amount}. Current fund value is only ₹${prevBal}. Negative values are prohibited.` };
      }
      newBal = Math.round((prevBal - amount) * 100) / 100;
    } else if (type === 'set_fixed') {
      if (amount < 0) {
        sound.playWarning();
        return { success: false, error: 'Fund value cannot be set to a negative number.' };
      }
      delta = Math.abs(amount - prevBal);
      newBal = Math.round(amount * 100) / 100;
    }

    sound.playSuccess();
    const nowIso = new Date().toISOString();
    const adjId = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const targetFundNames: Record<string, string> = {
      availableBalance: 'Available Balance',
      dailyWithdrawalLimit: 'Daily Withdrawal Limit (Quota)',
      withdrawnToday: 'Used Limit Today',
      pendingWithdrawals: 'Pending Withdrawals Hold',
      totalWithdrawn: 'Total Withdrawn Lifetime',
    };
    const fundLabel = targetFundNames[targetFund] || 'Available Balance';

    const adjustmentRecord: BalanceAdjustment = {
      id: adjId,
      userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type,
      targetFund,
      previousBalance: prevBal,
      adjustmentAmount: delta,
      newBalance: newBal,
      reason: reason.trim(),
      adminName: 'Super Admin',
      timestamp: nowIso,
    };

    // Update user fund in state
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            [targetFund]: newBal,
            ...(targetFund === 'availableBalance' && type === 'increase'
              ? { totalDeposited: Math.round((u.totalDeposited + amount) * 100) / 100 }
              : {}),
          };
        }
        return u;
      })
    );

    // Save to adjustments ledger
    setAdjustments((prev) => [adjustmentRecord, ...prev]);

    // Send notification to user
    const actionDesc =
      type === 'increase'
        ? `credited ₹${amount.toLocaleString('en-IN')}`
        : type === 'decrease'
        ? `debited ₹${amount.toLocaleString('en-IN')}`
        : `set to ₹${amount.toLocaleString('en-IN')}`;

    sendNotification(
      userId,
      `${fundLabel} Adjustment`,
      `Super Admin ${actionDesc} for ${fundLabel}. Reason: "${reason.trim()}". Updated value: ₹${newBal.toLocaleString('en-IN')}.`,
      'balance'
    );

    // Add immutable admin audit log
    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'FUNDS_ADJUSTMENT',
      targetId: userId,
      details: `${type.toUpperCase()} ${fundLabel} for ${targetUser.name} (${userId}). Previous: ₹${prevBal} -> New: ₹${newBal}. Reason: "${reason.trim()}".`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);

    return { success: true, adjustment: adjustmentRecord };
  };

  // Super Admin: Update Fee Configuration
  const updateFeeConfig = (newConfig: Partial<FeeConfiguration>) => {
    sound.playSuccess();
    setFeeConfig((prev) => ({ ...prev, ...newConfig }));
    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Super Admin',
      action: 'FEE_CONFIG_UPDATED',
      details: `Updated platform fee policy: ${JSON.stringify(newConfig)}`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // Super Admin: Toggle Emergency Killswitch
  const toggleWithdrawalsEnabled = (enabled?: boolean, notice?: string) => {
    sound.playWarning();
    const nextVal = enabled !== undefined ? enabled : !systemConfig.withdrawalsEnabled;
    setSystemConfig((prev) => ({
      ...prev,
      withdrawalsEnabled: nextVal,
      maintenanceNotice: notice !== undefined ? notice : prev.maintenanceNotice,
    }));

    const newLog: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Super Admin',
      action: nextVal ? 'ENABLE_WITHDRAWALS' : 'EMERGENCY_PAUSE_WITHDRAWALS',
      details: `Platform withdrawal status set to ${nextVal ? 'ENABLED' : 'PAUSED'}. Notice: "${notice || 'None'}".`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);
  };

  // Super Admin: Toggle Payment Method
  const togglePaymentMethod = (id: string) => {
    sound.playClick();
    setSystemConfig((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

  // Super Admin: Freeze/Unfreeze account
  const toggleUserFrozenState = (userId: string) => {
    sound.playWarning();
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newState = !u.isFrozen;
          const logItem: AdminLog = {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            adminName: 'Super Admin',
            action: newState ? 'FREEZE_USER_ACCOUNT' : 'UNFREEZE_USER_ACCOUNT',
            details: `Account for ${u.name} (${u.email}) was ${newState ? 'FROZEN' : 'RESTORED'}.`,
            ipAddress: '103.21.244.18',
          };
          setAdminLogs((logs) => [logItem, ...logs]);

          sendNotification(
            userId,
            newState ? 'Account Restricted' : 'Account Restored',
            newState
              ? 'Your account has been temporarily restricted by compliance. Please contact support.'
              : 'Your account restrictions have been cleared. All payout features are active.',
            'security'
          );

          return { ...u, isFrozen: newState };
        }
        return u;
      })
    );
  };

  // Super Admin: Permanently Delete User Account
  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'User record not found.' };
    }

    if (target.role === 'admin') {
      sound.playWarning();
      return { success: false, error: 'Cannot delete a Super Admin account.' };
    }

    if (target.id === currentUserId) {
      // Find fallback user if current user is being deleted
      const fallback = users.find((u) => u.id !== userId && u.role === 'user') || users.find((u) => u.role === 'admin');
      if (fallback) {
        setCurrentUserId(fallback.id);
      }
    }

    sound.playWarning();

    // Remove user
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // Cleanup associated pending/active withdrawal records
    setWithdrawals((prev) => prev.filter((w) => w.userId !== userId));

    // Cleanup notifications
    setNotifications((prev) => prev.filter((n) => n.userId !== userId));

    // Immutable administrative audit log entry
    const logItem: AdminLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Super Admin',
      action: 'DELETE_USER_PERMANENT',
      targetId: userId,
      details: `Permanently removed user account ${target.name} (${target.email}, ID: ${userId}). Remaining wallet balance ₹${target.availableBalance.toLocaleString('en-IN')} removed from system.`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((logs) => [logItem, ...logs]);

    return { success: true };
  };

  // Update Profile
  const updateUserProfile = (userId: string, updates: Partial<User>) => {
    sound.playSuccess();
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    sendNotification(userId, 'Profile Updated', 'Your personal account profile details have been updated.', 'system');
  };

  // Register new demo user
  const registerNewUser = (name: string, email: string, phone: string) => {
    if (!name || !email || !phone) {
      return { success: false, error: 'Name, email, and phone are required.' };
    }
    sound.playSuccess();
    const newId = `usr_${Date.now().toString().slice(-6)}`;
    const newUser: User = {
      id: newId,
      name,
      email,
      phone,
      role: 'user',
      kycStatus: 'pending',
      availableBalance: 25000.0,
      totalDeposited: 25000.0,
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
      dailyWithdrawalLimit: 500000.0,
      withdrawnToday: 0,
      registeredAt: new Date().toISOString(),
      bankBeneficiaries: [],
      upiBeneficiaries: [],
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newId);
    return { success: true, user: newUser };
  };

  // Add Beneficiaries
  const addBankBeneficiary = (beneficiary: Omit<BankBeneficiary, 'id'>) => {
    sound.playSuccess();
    const newBeneficiary: BankBeneficiary = {
      ...beneficiary,
      id: `bnk_${Date.now()}`,
    };
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            bankBeneficiaries: [newBeneficiary, ...u.bankBeneficiaries],
          };
        }
        return u;
      })
    );
  };

  const addUpiBeneficiary = (beneficiary: Omit<UpiBeneficiary, 'id'>) => {
    sound.playSuccess();
    const newBeneficiary: UpiBeneficiary = {
      ...beneficiary,
      id: `upi_${Date.now()}`,
    };
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            upiBeneficiaries: [newBeneficiary, ...u.upiBeneficiaries],
          };
        }
        return u;
      })
    );
  };

  const deletePayoutAccount = (
    userId: string,
    accountType: 'bank' | 'upi',
    accountId: string,
    reason = 'Administrative compliance removal'
  ) => {
    sound.playSuccess();
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'User not found.' };
    }

    let deletedIdentifier = accountId;

    if (accountType === 'bank') {
      const bnk = targetUser.bankBeneficiaries.find((b) => b.id === accountId);
      if (bnk) deletedIdentifier = `${bnk.bankName} (•••• ${bnk.accountNumber.slice(-4)})`;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            const updatedBanks = u.bankBeneficiaries.filter((b) => b.id !== accountId);
            // If the deleted one was default, set another as default
            if (updatedBanks.length > 0 && !updatedBanks.some((b) => b.isDefault)) {
              updatedBanks[0].isDefault = true;
            }
            return {
              ...u,
              bankBeneficiaries: updatedBanks,
            };
          }
          return u;
        })
      );
    } else {
      const upi = targetUser.upiBeneficiaries.find((b) => b.id === accountId);
      if (upi) deletedIdentifier = upi.upiId;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            const updatedUpi = u.upiBeneficiaries.filter((b) => b.id !== accountId);
            if (updatedUpi.length > 0 && !updatedUpi.some((b) => b.isDefault)) {
              updatedUpi[0].isDefault = true;
            }
            return {
              ...u,
              upiBeneficiaries: updatedUpi,
            };
          }
          return u;
        })
      );
    }

    // Add immutable Admin Audit Log
    const nowIso = new Date().toISOString();
    const newLog: AdminLog = {
      id: `log_del_payout_${Date.now()}`,
      timestamp: nowIso,
      adminName: 'Super Admin',
      action: 'UPDATE_USER',
      targetId: userId,
      details: `Admin deleted ${accountType.toUpperCase()} payout account "${deletedIdentifier}" for user ${targetUser.name} (${userId}). Reason: ${reason}`,
      ipAddress: '103.21.244.18',
    };
    setAdminLogs((prev) => [newLog, ...prev]);

    // Send user notification
    sendNotification(
      userId,
      'Payout Account Removed',
      `Your linked payout account (${deletedIdentifier}) was removed by Compliance/Admin. Reason: ${reason}. You can link a new verified account anytime.`,
      'security'
    );

    return { success: true };
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = (userId: string) => {
    sound.playClick();
    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = (userId: string) => {
    sound.playClick();
    setNotifications((prev) => prev.filter((n) => n.userId !== userId));
  };

  // Reset to default seed
  const resetToDefault = () => {
    sound.playWarning();
    setUsers(INITIAL_USERS);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setFeeConfig(INITIAL_FEE_CONFIG);
    setAdminLogs(INITIAL_ADMIN_LOGS);
    setAdjustments(INITIAL_ADJUSTMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSystemConfig(INITIAL_SYSTEM_CONFIG);
    setCurrentUserId('usr_vikram_89');
    setCurrentRole('user');
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}users`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}withdrawals`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}feeConfig`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}adminLogs`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}adjustments`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}notifications`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}systemConfig`);
  };

  return (
    <FintechContext.Provider
      value={{
        currentUser,
        users,
        withdrawals,
        feeConfig,
        adminLogs,
        adjustments,
        notifications,
        systemConfig,
        currentRole,
        theme,
        adminAuthenticated,
        setAdminAuthenticated,
        toggleTheme,
        switchRole,
        switchUser,
        calculateFee,
        requestWithdrawal,
        verifyOtpAndSubmit,
        depositFunds,
        adminApproveRequest,
        adminMarkProcessing,
        adminMarkCompleted,
        adminRejectRequest,
        deleteTransaction,
        adjustUserBalance,
        updateFeeConfig,
        toggleWithdrawalsEnabled,
        togglePaymentMethod,
        toggleUserFrozenState,
        deleteUser,
        updateUserProfile,
        registerNewUser,
        addBankBeneficiary,
        addUpiBeneficiary,
        deletePayoutAccount,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,
        resetToDefault,
      }}
    >
      {children}
    </FintechContext.Provider>
  );
};

export const useFintech = (): FintechContextType => {
  const context = useContext(FintechContext);
  if (!context) {
    throw new Error('useFintech must be used within a FintechProvider');
  }
  return context;
};
