import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  cleanUndefined,
  toIsoString,
} from '../firebase';
import {
  User,
  WithdrawalRequest,
  FeeConfiguration,
  AdminLog,
  PaymentMethodType,
  BankBeneficiary,
  UpiBeneficiary,
  BalanceAdjustment,
  NotificationItem,
  SystemConfig,
  UpcomingWithdrawal,
  UpcomingWithdrawalStatus,
  AppSecurityConfig,
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
import {
  DEFAULT_SECURITY_CONFIG,
  generateSalt,
  hashSecurityPassword,
  verifySecurityCredentials,
} from '../utils/security';

interface CalculateFeeResult {
  feeAmount: number;
  gstAmount: number;
  totalDeductions: number;
  netPayableAmount: number;
}

interface FintechContextType {
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  dbLoading: boolean;
  isAdminAccount: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  currentUser: User;
  users: User[];
  withdrawals: WithdrawalRequest[];
  feeConfig: FeeConfiguration;
  adminLogs: AdminLog[];
  adjustments: BalanceAdjustment[];
  notifications: NotificationItem[];
  systemConfig: SystemConfig;
  upcomingWithdrawals: UpcomingWithdrawal[];
  currentRole: 'user' | 'admin';
  theme: 'dark' | 'light';
  adminAuthenticated: boolean;
  setAdminAuthenticated: (val: boolean) => void;
  toggleTheme: () => void;
  switchRole: (role: 'user' | 'admin') => void;
  switchUser: (userId: string) => void;
  calculateFee: (amount: number) => CalculateFeeResult;
  calculateRefundFee: (amount: number) => { refundFeeAmount: number; netRefundAmount: number };
  requestWithdrawal: (params: {
    upcomingWithdrawalId: string;
    paymentMethod: PaymentMethodType;
    beneficiaryId: string;
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
  adminMarkCompleted: (requestId: string, utrNumber: string, adminNote?: string) => void;
  adminRejectRequest: (requestId: string, reason: string, adminNote?: string) => void;
  updateWithdrawalAdminNote: (
    requestId: string,
    note: string,
    notifyUser?: boolean
  ) => { success: boolean; error?: string };
  deleteTransaction: (requestId: string, refundIfPending?: boolean) => { success: boolean; error?: string };

  // Dedicated Balance Management
  adjustUserBalance: (params: {
    userId: string;
    type: 'increase' | 'decrease' | 'set_fixed';
    targetFund?: 'availableBalance' | 'dailyWithdrawalLimit' | 'withdrawnToday' | 'pendingWithdrawals' | 'totalWithdrawn';
    amount: number;
    reason: string;
    pendingNote?: string;
  }) => { success: boolean; error?: string; adjustment?: BalanceAdjustment };
  updatePendingFundNote: (
    userId: string,
    note: string,
    notifyUser?: boolean
  ) => { success: boolean; error?: string };

  // Admin-Managed Upcoming Withdraw List
  createUpcomingWithdrawal: (params: {
    targetUserId: string;
    title: string;
    withdrawalAmount: number;
    withdrawalCharge: number;
    scheduledDate: string;
    paymentMethod: 'upi' | 'bank_transfer' | 'any';
    status?: UpcomingWithdrawalStatus;
    note?: string;
    notifyUser?: boolean;
  }) => { success: boolean; error?: string; item?: UpcomingWithdrawal };
  updateUpcomingWithdrawal: (
    id: string,
    updates: Partial<{
      targetUserId: string;
      title: string;
      withdrawalAmount: number;
      withdrawalCharge: number;
      scheduledDate: string;
      paymentMethod: 'upi' | 'bank_transfer' | 'any';
      status: UpcomingWithdrawalStatus;
      note: string;
    }>
  ) => { success: boolean; error?: string };
  deleteUpcomingWithdrawal: (id: string) => { success: boolean; error?: string };

  // Configuration & Security
  updateFeeConfig: (newConfig: Partial<FeeConfiguration>) => void;
  toggleWithdrawalsEnabled: (enabled?: boolean, notice?: string) => void;
  togglePaymentMethod: (id: string) => void;
  toggleUserFrozenState: (userId: string) => void;
  deleteUser: (userId: string) => { success: boolean; error?: string };
  updateUserProfile: (userId: string, updates: Partial<User>) => void;
  registerNewUser: (name: string, email: string, phone: string) => { success: boolean; error?: string; user?: User };

  // Beneficiaries
  addBankBeneficiary: (
    userId: string,
    beneficiary: Omit<BankBeneficiary, 'id'>
  ) => { success: boolean; error?: string };
  addUpiBeneficiary: (
    userId: string,
    beneficiary: Omit<UpiBeneficiary, 'id'>
  ) => { success: boolean; error?: string };
  deletePayoutAccount: (
    userId: string,
    accountType: 'bank' | 'upi',
    accountId: string,
    reason?: string
  ) => { success: boolean; error?: string };

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  clearAllNotifications: (userId: string) => void;

  // App-Open Security Gate (Username & Password)
  securityConfig: AppSecurityConfig;
  appSecurityUnlocked: boolean;
  unlockAppWithCredentials: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
  updateAppSecurityConfig: (params: {
    enabled: boolean;
    username: string;
    newPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetAppSecurityToDefault: (options?: {
    autoUnlock?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;

  // Utilities
  resetToDefault: () => void;
}

const FintechContext = createContext<FintechContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'payflow_storage_v2_';

const FALLBACK_USER: User = {
  id: 'loading_user',
  name: 'PayFlow Account',
  email: 'user@payflow.app',
  phone: '+91 98765 00000',
  role: 'user',
  kycStatus: 'verified',
  availableBalance: 0,
  totalDeposited: 0,
  totalWithdrawn: 0,
  pendingWithdrawals: 0,
  dailyWithdrawalLimit: 500000,
  withdrawnToday: 0,
  registeredAt: new Date().toISOString(),
  bankBeneficiaries: [],
  upiBeneficiaries: [],
  isFrozen: false,
};

function sanitizeUserForWrite(u: User) {
  return cleanUndefined({
    id: u.id.slice(0, 128),
    name: (u.name || 'PayFlow Member').slice(0, 100),
    email: (u.email || 'member@payflow.app').slice(0, 150),
    phone: (u.phone || '+91 98765 00000').slice(0, 30),
    role: u.role,
    kycStatus: u.kycStatus,
    avatarUrl: u.avatarUrl ? u.avatarUrl.slice(0, 500) : undefined,
    availableBalance: Math.max(0, Number(u.availableBalance) || 0),
    totalDeposited: Math.max(0, Number(u.totalDeposited) || 0),
    totalWithdrawn: Math.max(0, Number(u.totalWithdrawn) || 0),
    pendingWithdrawals: Math.max(0, Number(u.pendingWithdrawals) || 0),
    dailyWithdrawalLimit: Math.max(0, Number(u.dailyWithdrawalLimit) || 500000),
    withdrawnToday: Math.max(0, Number(u.withdrawnToday) || 0),
    registeredAt: (u.registeredAt || new Date().toISOString()).slice(0, 50),
    bankBeneficiaries: (u.bankBeneficiaries || []).slice(0, 10),
    upiBeneficiaries: (u.upiBeneficiaries || []).slice(0, 10),
    isFrozen: Boolean(u.isFrozen),
    address: u.address ? u.address.slice(0, 300) : undefined,
    panNumber: u.panNumber ? u.panNumber.slice(0, 20) : undefined,
    pendingFundNote: u.pendingFundNote ? u.pendingFundNote.slice(0, 500) : undefined,
  });
}

function mapDocToUser(id: string, data: Record<string, unknown>): User {
  return {
    id: String(data.id || id),
    name: String(data.name || 'PayFlow Member'),
    email: String(data.email || ''),
    phone: String(data.phone || '+91 98765 00000'),
    role: data.role === 'admin' ? 'admin' : 'user',
    kycStatus:
      data.kycStatus === 'verified' || data.kycStatus === 'pending' || data.kycStatus === 'unverified'
        ? data.kycStatus
        : 'pending',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : undefined,
    availableBalance: Number(data.availableBalance ?? 0),
    totalDeposited: Number(data.totalDeposited ?? 0),
    totalWithdrawn: Number(data.totalWithdrawn ?? 0),
    pendingWithdrawals: Number(data.pendingWithdrawals ?? 0),
    dailyWithdrawalLimit: Number(data.dailyWithdrawalLimit ?? 500000),
    withdrawnToday: Number(data.withdrawnToday ?? 0),
    registeredAt: toIsoString(data.registeredAt),
    bankBeneficiaries: Array.isArray(data.bankBeneficiaries) ? (data.bankBeneficiaries as BankBeneficiary[]) : [],
    upiBeneficiaries: Array.isArray(data.upiBeneficiaries) ? (data.upiBeneficiaries as UpiBeneficiary[]) : [],
    isFrozen: Boolean(data.isFrozen),
    address: typeof data.address === 'string' ? data.address : undefined,
    panNumber: typeof data.panNumber === 'string' ? data.panNumber : undefined,
    pendingFundNote: typeof data.pendingFundNote === 'string' ? data.pendingFundNote : undefined,
  };
}

function mapDocToWithdrawal(id: string, data: Record<string, unknown>): WithdrawalRequest {
  return {
    id: String(data.id || id),
    userId: String(data.userId || ''),
    userName: String(data.userName || ''),
    userEmail: String(data.userEmail || ''),
    amount: Number(data.amount ?? 0),
    feeAmount: Number(data.feeAmount ?? 0),
    gstAmount: Number(data.gstAmount ?? 0),
    netPayableAmount: Number(data.netPayableAmount ?? 0),
    paymentMethod: data.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'upi',
    paymentDetails: (data.paymentDetails as WithdrawalRequest['paymentDetails']) || {},
    status: (data.status as WithdrawalRequest['status']) || 'pending',
    utrNumber: typeof data.utrNumber === 'string' ? data.utrNumber : undefined,
    rejectionReason: typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
    adminNote: typeof data.adminNote === 'string' ? data.adminNote : undefined,
    refundFeeAmount: typeof data.refundFeeAmount === 'number' ? Number(data.refundFeeAmount) : undefined,
    refundedAmount: typeof data.refundedAmount === 'number' ? Number(data.refundedAmount) : undefined,
    statusTimeline: Array.isArray(data.statusTimeline)
      ? (data.statusTimeline as WithdrawalRequest['statusTimeline'])
      : [],
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    completedAt: data.completedAt ? toIsoString(data.completedAt) : undefined,
    referenceNumber: String(data.referenceNumber || id),
    upcomingWithdrawalId:
      typeof data.upcomingWithdrawalId === 'string' ? data.upcomingWithdrawalId : undefined,
  };
}

function mapDocToUpcomingWithdrawal(id: string, data: Record<string, unknown>): UpcomingWithdrawal {
  const withdrawalAmount = Math.max(0, Number(data.withdrawalAmount ?? 0));
  const withdrawalCharge = Math.min(withdrawalAmount, Math.max(0, Number(data.withdrawalCharge ?? 0)));
  const netAmount =
    typeof data.netAmount === 'number'
      ? Math.max(0, Number(data.netAmount))
      : Math.max(0, Math.round((withdrawalAmount - withdrawalCharge) * 100) / 100);
  const statusVal = data.status;
  const status: UpcomingWithdrawalStatus =
    statusVal === 'ready' || statusVal === 'completed' || statusVal === 'cancelled'
      ? statusVal
      : 'upcoming';
  const pm = data.paymentMethod;
  const paymentMethod: UpcomingWithdrawal['paymentMethod'] =
    pm === 'upi' || pm === 'bank_transfer' ? pm : 'any';

  return {
    id: String(data.id || id),
    targetUserId: String(data.targetUserId || 'ALL'),
    targetUserName: String(data.targetUserName || 'All Users'),
    title: String(data.title || 'Scheduled Withdrawal'),
    withdrawalAmount,
    withdrawalCharge,
    netAmount,
    scheduledDate: String(data.scheduledDate || new Date().toISOString().slice(0, 10)),
    paymentMethod,
    status,
    note: typeof data.note === 'string' ? data.note : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export const FintechProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state (local UI preference)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}theme`);
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    }
    return 'dark';
  });

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [isAdminAccount, setIsAdminAccount] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Role & Admin view state
  const [currentRole, setCurrentRole] = useState<'user' | 'admin'>('user');
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(true);

  // Live Firestore-backed application state
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfiguration>(INITIAL_FEE_CONFIG);
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [upcomingWithdrawals, setUpcomingWithdrawals] = useState<UpcomingWithdrawal[]>([]);
  const [securityConfig, setSecurityConfig] = useState<AppSecurityConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}security_gate`);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppSecurityConfig>;
          if (
            typeof parsed.username === 'string' &&
            typeof parsed.passwordSalt === 'string' &&
            typeof parsed.passwordHash === 'string' &&
            /^[a-f0-9]{64}$/.test(parsed.passwordHash)
          ) {
            return {
              enabled: parsed.enabled !== false,
              username: parsed.username,
              passwordSalt: parsed.passwordSalt,
              passwordHash: parsed.passwordHash,
              updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : 'Admin',
              updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
            };
          }
        }
      } catch {
        // Ignore invalid local cache
      }
    }
    return DEFAULT_SECURITY_CONFIG;
  });
  const [appSecurityUnlocked, setAppSecurityUnlocked] = useState<boolean>(false);
  const unlockedWithHashRef = useRef<string | null>(null);

  const seedingRef = useRef<boolean>(false);

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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setIsAdminAccount(false);
        setCurrentRole('user');
        setUsers([]);
        setWithdrawals([]);
        setAdjustments([]);
        setNotifications([]);
        setAdminLogs([]);
        setCurrentUserId('');
        setDbLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Bootstrap profile, admin registry, seed data (if admin), and attach real-time onSnapshot listeners
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    let isCancelled = false;
    const unsubscribers: (() => void)[] = [];

    const setupLiveDatabase = async () => {
      setDbLoading(true);
      try {
        const uid = firebaseUser.uid;
        const email = firebaseUser.email || '';
        const isBootstrappedAdmin =
          email === BOOTSTRAPPED_ADMIN_EMAIL && firebaseUser.emailVerified;

        let adminRoleExists = false;
        try {
          const adminSnap = await getDoc(doc(db, 'admins', uid));
          adminRoleExists = adminSnap.exists();
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `admins/${uid}`);
        }

        const resolvedIsAdmin = isBootstrappedAdmin || adminRoleExists;
        if (isCancelled) return;
        setIsAdminAccount(resolvedIsAdmin);
        setCurrentUserId((prev) => prev || uid);

        // Ensure bootstrapped admin has an /admins/{uid} document
        if (isBootstrappedAdmin && !adminRoleExists) {
          try {
            await setDoc(doc(db, 'admins', uid), {
              uid,
              email: email.slice(0, 150),
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `admins/${uid}`);
          }
        }

        // Ensure signed-in user's own /users/{uid} document exists
        const userDocRef = doc(db, 'users', uid);
        let userDocSnap;
        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        }

        if (!userDocSnap.exists()) {
          const newUserProfile: User = {
            id: uid,
            name: (firebaseUser.displayName || 'PayFlow Member').slice(0, 100),
            email: (email || `${uid}@payflow.app`).slice(0, 150),
            phone: '+91 98765 00000',
            role: resolvedIsAdmin ? 'admin' : 'user',
            kycStatus: 'verified',
            avatarUrl: firebaseUser.photoURL ? firebaseUser.photoURL.slice(0, 500) : undefined,
            availableBalance: 25000,
            totalDeposited: 25000,
            totalWithdrawn: 0,
            pendingWithdrawals: 0,
            dailyWithdrawalLimit: 500000,
            withdrawnToday: 0,
            registeredAt: new Date().toISOString(),
            bankBeneficiaries: [],
            upiBeneficiaries: [],
            isFrozen: false,
          };

          try {
            await setDoc(userDocRef, {
              ...sanitizeUserForWrite(newUserProfile),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
          }
        }

        // Seed initial platform config and demo ledger records once when Admin first opens the app
        if (resolvedIsAdmin && !seedingRef.current) {
          seedingRef.current = true;
          try {
            const feesSnap = await getDoc(doc(db, 'config', 'fees'));
            if (!feesSnap.exists()) {
              const batch = writeBatch(db);
              batch.set(doc(db, 'config', 'fees'), {
                ...INITIAL_FEE_CONFIG,
                updatedAt: serverTimestamp(),
              });
              batch.set(doc(db, 'config', 'system'), {
                ...INITIAL_SYSTEM_CONFIG,
                updatedAt: serverTimestamp(),
              });

              for (const seedUser of INITIAL_USERS) {
                batch.set(doc(db, 'users', seedUser.id), {
                  ...sanitizeUserForWrite(seedUser),
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }

              for (const seedW of INITIAL_WITHDRAWALS) {
                batch.set(
                  doc(db, 'withdrawals', seedW.id),
                  cleanUndefined({
                    ...seedW,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  })
                );
              }

              for (const seedAdj of INITIAL_ADJUSTMENTS) {
                batch.set(
                  doc(db, 'adjustments', seedAdj.id),
                  cleanUndefined({
                    ...seedAdj,
                    createdAt: serverTimestamp(),
                  })
                );
              }

              for (const seedLog of INITIAL_ADMIN_LOGS) {
                batch.set(
                  doc(db, 'adminLogs', seedLog.id),
                  cleanUndefined({
                    ...seedLog,
                    createdAt: serverTimestamp(),
                  })
                );
              }

              for (const seedNotif of INITIAL_NOTIFICATIONS) {
                batch.set(
                  doc(db, 'notifications', seedNotif.id),
                  cleanUndefined({
                    ...seedNotif,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  })
                );
              }

              await batch.commit();
            }

            const securitySnap = await getDoc(doc(db, 'config', 'security'));
            if (!securitySnap.exists()) {
              await setDoc(doc(db, 'config', 'security'), {
                enabled: DEFAULT_SECURITY_CONFIG.enabled,
                username: DEFAULT_SECURITY_CONFIG.username,
                passwordSalt: DEFAULT_SECURITY_CONFIG.passwordSalt,
                passwordHash: DEFAULT_SECURITY_CONFIG.passwordHash,
                updatedBy: email || 'Super Admin',
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'seed/initial');
          }
        }

        if (isCancelled) return;

        // Attach shared config listeners
        unsubscribers.push(
          onSnapshot(
            doc(db, 'config', 'fees'),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                setFeeConfig({
                  ...INITIAL_FEE_CONFIG,
                  feeType: data.feeType || INITIAL_FEE_CONFIG.feeType,
                  flatFee: Number(data.flatFee ?? INITIAL_FEE_CONFIG.flatFee),
                  percentageFee: Number(data.percentageFee ?? INITIAL_FEE_CONFIG.percentageFee),
                  gstRatePercent: Number(data.gstRatePercent ?? INITIAL_FEE_CONFIG.gstRatePercent),
                  minWithdrawalAmount: Number(data.minWithdrawalAmount ?? INITIAL_FEE_CONFIG.minWithdrawalAmount),
                  maxWithdrawalAmountPerTxn: Number(
                    data.maxWithdrawalAmountPerTxn ?? INITIAL_FEE_CONFIG.maxWithdrawalAmountPerTxn
                  ),
                  dailyCeilingLimit: Number(data.dailyCeilingLimit ?? INITIAL_FEE_CONFIG.dailyCeilingLimit),
                  freeWithdrawalsPerMonth: Number(
                    data.freeWithdrawalsPerMonth ?? INITIAL_FEE_CONFIG.freeWithdrawalsPerMonth
                  ),
                  refundFeeEnabled:
                    typeof data.refundFeeEnabled === 'boolean'
                      ? data.refundFeeEnabled
                      : INITIAL_FEE_CONFIG.refundFeeEnabled,
                  refundFeeType:
                    data.refundFeeType === 'flat' ||
                    data.refundFeeType === 'percentage' ||
                    data.refundFeeType === 'flat_plus_percent'
                      ? data.refundFeeType
                      : INITIAL_FEE_CONFIG.refundFeeType,
                  refundFlatFee: Number(data.refundFlatFee ?? INITIAL_FEE_CONFIG.refundFlatFee),
                  refundPercentageFee: Number(
                    data.refundPercentageFee ?? INITIAL_FEE_CONFIG.refundPercentageFee
                  ),
                });
              }
            },
            (err) => handleFirestoreError(err, OperationType.GET, 'config/fees')
          )
        );

        unsubscribers.push(
          onSnapshot(
            doc(db, 'config', 'system'),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                setSystemConfig({
                  withdrawalsEnabled: data.withdrawalsEnabled !== false,
                  maintenanceNotice: typeof data.maintenanceNotice === 'string' ? data.maintenanceNotice : '',
                  require2FA: data.require2FA !== false,
                  paymentMethods: Array.isArray(data.paymentMethods)
                    ? data.paymentMethods
                    : INITIAL_SYSTEM_CONFIG.paymentMethods,
                });
              }
            },
            (err) => handleFirestoreError(err, OperationType.GET, 'config/system')
          )
        );

        unsubscribers.push(
          onSnapshot(
            doc(db, 'config', 'security'),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                const nextSec: AppSecurityConfig = {
                  enabled: data.enabled !== false,
                  username: String(data.username || DEFAULT_SECURITY_CONFIG.username),
                  passwordSalt: String(data.passwordSalt || DEFAULT_SECURITY_CONFIG.passwordSalt),
                  passwordHash: String(data.passwordHash || DEFAULT_SECURITY_CONFIG.passwordHash),
                  updatedBy: String(data.updatedBy || 'Admin'),
                  updatedAt: data.updatedAt ? toIsoString(data.updatedAt) : undefined,
                };
                setSecurityConfig(nextSec);
                try {
                  localStorage.setItem(`${STORAGE_KEY_PREFIX}security_gate`, JSON.stringify(nextSec));
                } catch {
                  // Ignore storage quota errors
                }
                if (
                  nextSec.enabled &&
                  unlockedWithHashRef.current &&
                  unlockedWithHashRef.current !== nextSec.passwordHash
                ) {
                  unlockedWithHashRef.current = null;
                  setAppSecurityUnlocked(false);
                }
              }
            },
            (err) => handleFirestoreError(err, OperationType.GET, 'config/security')
          )
        );

        if (resolvedIsAdmin) {
          // Admin listens to full platform collections in real time
          unsubscribers.push(
            onSnapshot(
              collection(db, 'users'),
              (snap) => {
                const list = snap.docs.map((d) => mapDocToUser(d.id, d.data()));
                setUsers(list);
                setDbLoading(false);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'users')
            )
          );

          unsubscribers.push(
            onSnapshot(
              collection(db, 'withdrawals'),
              (snap) => {
                const list = snap.docs
                  .map((d) => mapDocToWithdrawal(d.id, d.data()))
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setWithdrawals(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals')
            )
          );

          unsubscribers.push(
            onSnapshot(
              collection(db, 'notifications'),
              (snap) => {
                const list = snap.docs
                  .map((d) => {
                    const data = d.data();
                    return {
                      id: String(data.id || d.id),
                      userId: String(data.userId || ''),
                      title: String(data.title || ''),
                      message: String(data.message || ''),
                      type: (data.type as NotificationItem['type']) || 'system',
                      timestamp: String(data.timestamp || toIsoString(data.createdAt)),
                      read: Boolean(data.read),
                      linkTxnId: typeof data.linkTxnId === 'string' ? data.linkTxnId : undefined,
                    };
                  })
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setNotifications(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
            )
          );

          unsubscribers.push(
            onSnapshot(
              collection(db, 'adjustments'),
              (snap) => {
                const list = snap.docs
                  .map((d) => {
                    const data = d.data();
                    return {
                      id: String(data.id || d.id),
                      userId: String(data.userId || ''),
                      userName: String(data.userName || ''),
                      userEmail: String(data.userEmail || ''),
                      type: data.type as BalanceAdjustment['type'],
                      targetFund: data.targetFund as BalanceAdjustment['targetFund'],
                      previousBalance: Number(data.previousBalance ?? 0),
                      adjustmentAmount: Number(data.adjustmentAmount ?? 0),
                      newBalance: Number(data.newBalance ?? 0),
                      reason: String(data.reason || ''),
                      adminName: String(data.adminName || ''),
                      timestamp: String(data.timestamp || toIsoString(data.createdAt)),
                    };
                  })
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setAdjustments(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'adjustments')
            )
          );

          unsubscribers.push(
            onSnapshot(
              collection(db, 'adminLogs'),
              (snap) => {
                const list = snap.docs
                  .map((d) => {
                    const data = d.data();
                    return {
                      id: String(data.id || d.id),
                      timestamp: String(data.timestamp || toIsoString(data.createdAt)),
                      adminName: String(data.adminName || ''),
                      action: String(data.action || ''),
                      targetId: typeof data.targetId === 'string' ? data.targetId : undefined,
                      details: String(data.details || ''),
                      ipAddress: String(data.ipAddress || '127.0.0.1'),
                    };
                  })
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setAdminLogs(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'adminLogs')
            )
          );

          unsubscribers.push(
            onSnapshot(
              collection(db, 'upcomingWithdrawals'),
              (snap) => {
                const list = snap.docs
                  .map((d) => mapDocToUpcomingWithdrawal(d.id, d.data()))
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setUpcomingWithdrawals(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'upcomingWithdrawals')
            )
          );
        } else {
          // Regular user strictly listens ONLY to their own PII-isolated records
          unsubscribers.push(
            onSnapshot(
              doc(db, 'users', uid),
              (snap) => {
                if (snap.exists()) {
                  setUsers([mapDocToUser(snap.id, snap.data())]);
                }
                setDbLoading(false);
              },
              (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
            )
          );

          unsubscribers.push(
            onSnapshot(
              query(collection(db, 'withdrawals'), where('userId', '==', uid)),
              (snap) => {
                const list = snap.docs
                  .map((d) => mapDocToWithdrawal(d.id, d.data()))
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setWithdrawals(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'withdrawals')
            )
          );

          unsubscribers.push(
            onSnapshot(
              query(collection(db, 'notifications'), where('userId', '==', uid)),
              (snap) => {
                const list = snap.docs
                  .map((d) => {
                    const data = d.data();
                    return {
                      id: String(data.id || d.id),
                      userId: String(data.userId || ''),
                      title: String(data.title || ''),
                      message: String(data.message || ''),
                      type: (data.type as NotificationItem['type']) || 'system',
                      timestamp: String(data.timestamp || toIsoString(data.createdAt)),
                      read: Boolean(data.read),
                      linkTxnId: typeof data.linkTxnId === 'string' ? data.linkTxnId : undefined,
                    };
                  })
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setNotifications(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
            )
          );

          unsubscribers.push(
            onSnapshot(
              query(collection(db, 'upcomingWithdrawals'), where('targetUserId', 'in', [uid, 'ALL'])),
              (snap) => {
                const list = snap.docs
                  .map((d) => mapDocToUpcomingWithdrawal(d.id, d.data()))
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setUpcomingWithdrawals(list);
              },
              (err) => handleFirestoreError(err, OperationType.LIST, 'upcomingWithdrawals')
            )
          );
        }
      } catch (err) {
        if (!isCancelled) {
          setDbLoading(false);
          throw err;
        }
      }
    };

    setupLiveDatabase();

    return () => {
      isCancelled = true;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [authReady, firebaseUser]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      sound.playClick();
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    sound.playClick();
    await signOut(auth);
  }, []);

  const currentUser =
    users.find((u) => u.id === currentUserId) ||
    users.find((u) => u.id === firebaseUser?.uid) ||
    users[0] ||
    FALLBACK_USER;

  const toggleTheme = () => {
    sound.playClick();
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const switchRole = (role: 'user' | 'admin') => {
    if (role === 'admin' && !isAdminAccount) {
      sound.playWarning();
      return;
    }
    sound.playClick();
    setCurrentRole(role);
    if (role === 'admin') {
      const adminUser =
        users.find((u) => u.id === firebaseUser?.uid) || users.find((u) => u.role === 'admin');
      if (adminUser) setCurrentUserId(adminUser.id);
    } else {
      const preferredUser =
        users.find((u) => u.id === firebaseUser?.uid) ||
        users.find((u) => u.role === 'user') ||
        users[0];
      if (preferredUser) setCurrentUserId(preferredUser.id);
    }
  };

  const switchUser = (userId: string) => {
    sound.playClick();
    setCurrentUserId(userId);
  };

  const writeNotificationDoc = (
    userId: string,
    title: string,
    message: string,
    type: 'withdrawal' | 'balance' | 'security' | 'system',
    linkTxnId?: string
  ) => {
    const id = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const payload = cleanUndefined({
      id: id.slice(0, 128),
      userId: userId.slice(0, 128),
      title: title.slice(0, 150),
      message: message.slice(0, 500),
      type,
      timestamp: new Date().toISOString(),
      read: false,
      linkTxnId: linkTxnId ? linkTxnId.slice(0, 128) : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setDoc(doc(db, 'notifications', id), payload).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `notifications/${id}`)
    );
  };

  const writeAdminLogDoc = (action: string, details: string, targetId?: string) => {
    if (!isAdminAccount) return;
    const id = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const payload = cleanUndefined({
      id: id.slice(0, 128),
      timestamp: new Date().toISOString(),
      adminName: (firebaseUser?.displayName || 'Super Admin').slice(0, 100),
      action: action.slice(0, 100),
      targetId: targetId ? targetId.slice(0, 128) : undefined,
      details: details.slice(0, 1000),
      ipAddress: '103.21.244.18',
      createdAt: serverTimestamp(),
    });
    setDoc(doc(db, 'adminLogs', id), payload).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `adminLogs/${id}`)
    );
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

  // Refund Fee Calculation Engine (Admin-controlled)
  const calculateRefundFee = (amount: number): { refundFeeAmount: number; netRefundAmount: number } => {
    if (!amount || amount <= 0) {
      return { refundFeeAmount: 0, netRefundAmount: 0 };
    }

    const enabled = feeConfig.refundFeeEnabled !== false;
    if (!enabled) {
      return { refundFeeAmount: 0, netRefundAmount: Math.round(amount * 100) / 100 };
    }

    const mode = feeConfig.refundFeeType || 'flat';
    const flat = Math.max(0, Number(feeConfig.refundFlatFee ?? 0));
    const pct = Math.max(0, Number(feeConfig.refundPercentageFee ?? 0));

    let rawFee = 0;
    if (mode === 'flat') {
      rawFee = flat;
    } else if (mode === 'percentage') {
      rawFee = (amount * pct) / 100;
    } else if (mode === 'flat_plus_percent') {
      rawFee = flat + (amount * pct) / 100;
    }

    const cappedFee = Math.min(amount, Math.round(rawFee * 100) / 100);
    const netRefund = Math.max(0, Math.round((amount - cappedFee) * 100) / 100);

    return {
      refundFeeAmount: cappedFee,
      netRefundAmount: netRefund,
    };
  };

  // Request Withdrawal (Strictly from Admin-given Withdrawal List + Admin-assigned Beneficiary Account)
  const requestWithdrawal = ({
    upcomingWithdrawalId,
    paymentMethod,
    beneficiaryId,
  }: {
    upcomingWithdrawalId: string;
    paymentMethod: PaymentMethodType;
    beneficiaryId: string;
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

    const upcomingItem = upcomingWithdrawals.find((item) => item.id === upcomingWithdrawalId);
    if (
      !upcomingItem ||
      (upcomingItem.targetUserId !== 'ALL' && upcomingItem.targetUserId !== currentUser.id)
    ) {
      sound.playWarning();
      return {
        success: false,
        error: 'Only withdrawals authorized by Super Admin in the Withdrawal List can be withdrawn.',
      };
    }

    if (upcomingItem.status !== 'upcoming' && upcomingItem.status !== 'ready') {
      sound.playWarning();
      return {
        success: false,
        error: `This withdrawal list item (${upcomingItem.title}) is ${upcomingItem.status} and cannot be withdrawn.`,
      };
    }

    const alreadyWithdrawn = withdrawals.some(
      (w) =>
        w.userId === currentUser.id &&
        w.upcomingWithdrawalId === upcomingItem.id &&
        w.status !== 'rejected' &&
        w.status !== 'failed'
    );
    if (alreadyWithdrawn) {
      sound.playWarning();
      return {
        success: false,
        error: 'You have already submitted a withdrawal for this item from the Withdrawal List.',
      };
    }

    if (upcomingItem.paymentMethod !== 'any' && upcomingItem.paymentMethod !== paymentMethod) {
      sound.playWarning();
      return {
        success: false,
        error: `Admin restricted this withdrawal to ${
          upcomingItem.paymentMethod === 'upi' ? 'UPI Instant' : 'Bank IMPS/NEFT'
        }.`,
      };
    }

    let paymentDetails: WithdrawalRequest['paymentDetails'];
    if (paymentMethod === 'upi') {
      const assignedUpi = currentUser.upiBeneficiaries.find(
        (u) => u.id === beneficiaryId || u.upiId === beneficiaryId
      );
      if (!assignedUpi) {
        sound.playWarning();
        return {
          success: false,
          error:
            'No Admin-assigned UPI beneficiary selected. Only Super Admin can add beneficiary accounts.',
        };
      }
      paymentDetails = {
        upiId: assignedUpi.upiId,
        holderName: assignedUpi.holderName,
      };
    } else {
      const assignedBank = currentUser.bankBeneficiaries.find((b) => b.id === beneficiaryId);
      if (!assignedBank) {
        sound.playWarning();
        return {
          success: false,
          error:
            'No Admin-assigned Bank beneficiary selected. Only Super Admin can add beneficiary accounts.',
        };
      }
      paymentDetails = {
        accountNumber: assignedBank.accountNumber,
        ifscCode: assignedBank.ifscCode,
        bankName: assignedBank.bankName,
        holderName: assignedBank.accountHolderName,
        accountType: assignedBank.accountType,
      };
    }

    const amount = upcomingItem.withdrawalAmount;
    const feeAmount = upcomingItem.withdrawalCharge;
    const gstAmount = 0;
    const netPayableAmount = upcomingItem.netAmount;

    if (amount > currentUser.availableBalance) {
      sound.playWarning();
      return {
        success: false,
        error: `Insufficient available balance. You have ₹${currentUser.availableBalance.toLocaleString('en-IN')}.`,
      };
    }

    if (currentUser.withdrawnToday + amount > currentUser.dailyWithdrawalLimit) {
      const remainingLimit = Math.max(0, currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday);
      sound.playWarning();
      return {
        success: false,
        error: `Daily limit exceeded. Remaining daily quota is ₹${remainingLimit.toLocaleString('en-IN')}.`,
      };
    }

    if (netPayableAmount <= 0) {
      sound.playWarning();
      return {
        success: false,
        error: 'Net payable amount after withdrawal charge must be greater than ₹0.',
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
      userName: currentUser.name.slice(0, 100),
      userEmail: currentUser.email.slice(0, 150),
      amount,
      feeAmount,
      gstAmount,
      netPayableAmount,
      paymentMethod,
      paymentDetails,
      status: 'pending',
      referenceNumber: refNum,
      upcomingWithdrawalId: upcomingItem.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusTimeline: [
        {
          status: 'pending',
          timestamp: nowIso,
          title: 'Withdrawal Initiated',
          description: `Withdrawal for "${upcomingItem.title}" (₹${amount.toLocaleString('en-IN')}, Charge ₹${feeAmount.toLocaleString('en-IN')}) created via ${
            paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'
          }.`,
          actor: currentUser.name.slice(0, 100),
        },
      ],
    };

    const nextAvailable = Math.round((currentUser.availableBalance - amount) * 100) / 100;
    const nextPending = Math.round((currentUser.pendingWithdrawals + amount) * 100) / 100;
    const nextToday = Math.round((currentUser.withdrawnToday + amount) * 100) / 100;

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', currentUser.id), {
      availableBalance: nextAvailable,
      pendingWithdrawals: nextPending,
      withdrawnToday: nextToday,
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'withdrawals', txnId),
      cleanUndefined({
        id: txnId,
        userId: currentUser.id,
        userName: currentUser.name.slice(0, 100),
        userEmail: currentUser.email.slice(0, 150),
        amount,
        feeAmount,
        gstAmount,
        netPayableAmount,
        paymentMethod,
        paymentDetails,
        status: 'pending',
        referenceNumber: refNum,
        upcomingWithdrawalId: upcomingItem.id,
        statusTimeline: newRequest.statusTimeline,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    batch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, `withdrawals/${txnId}`));

    return {
      success: true,
      request: newRequest,
      otpCode,
    };
  };

  // Verify OTP and advance transaction timeline
  const verifyOtpAndSubmit = (requestId: string, enteredOtp: string, expectedOtp: string) => {
    if (enteredOtp.trim() !== expectedOtp.trim()) {
      sound.playWarning();
      return { success: false, error: 'Invalid 2FA OTP code. Please check and try again.' };
    }

    sound.playSuccess();
    const nowIso = new Date().toISOString();
    const targetReq = withdrawals.find((w) => w.id === requestId);
    const updatedTimeline = [
      ...(targetReq?.statusTimeline || []),
      {
        status: 'pending' as const,
        timestamp: nowIso,
        title: '2FA OTP Verified',
        description: 'Customer authenticated via 6-digit secure SMS OTP. Request forwarded to Treasury queue.',
        actor: 'PayFlow Security Gateway',
      },
    ].slice(0, 20);

    updateDoc(doc(db, 'withdrawals', requestId), {
      statusTimeline: updatedTimeline,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${requestId}`));

    writeNotificationDoc(
      currentUser.id,
      'Withdrawal Request Submitted',
      `Your payout request ${requestId} has been authenticated with 2FA and queued for review.`,
      'withdrawal',
      requestId
    );

    return { success: true };
  };

  // Deposit funds (Admin-authorized ledger credit)
  const depositFunds = (amount: number, method: 'UPI' | 'NetBanking' | 'DebitCard') => {
    if (amount <= 0) return;
    if (!isAdminAccount) {
      sound.playWarning();
      return;
    }
    sound.playSuccess();

    const nextAvailable = Math.round((currentUser.availableBalance + amount) * 100) / 100;
    const nextDeposited = Math.round((currentUser.totalDeposited + amount) * 100) / 100;

    updateDoc(doc(db, 'users', currentUser.id), {
      availableBalance: nextAvailable,
      totalDeposited: nextDeposited,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.id}`));

    writeNotificationDoc(
      currentUser.id,
      'Deposit Successful',
      `₹${amount.toLocaleString('en-IN')} was successfully deposited into your wallet via ${method}.`,
      'balance'
    );

    writeAdminLogDoc(
      'DEPOSIT_SUCCESS',
      `User ${currentUser.name} deposited ₹${amount.toLocaleString('en-IN')} via ${method}. Instant settlement.`,
      currentUser.id
    );
  };

  // SUPER ADMIN ACTION 1: Approve Request
  const adminApproveRequest = (requestId: string) => {
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;
    sound.playSuccess();
    const nowIso = new Date().toISOString();

    const nextTimeline = [
      ...targetReq.statusTimeline,
      {
        status: 'approved' as const,
        timestamp: nowIso,
        title: 'Withdrawal Approved by Compliance',
        description:
          'Super Admin reviewed and approved the withdrawal request. Scheduled for banking gateway dispatch.',
        actor: 'Super Admin',
      },
    ].slice(0, 20);

    updateDoc(doc(db, 'withdrawals', requestId), {
      status: 'approved',
      statusTimeline: nextTimeline,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${requestId}`));

    writeNotificationDoc(
      targetReq.userId,
      'Withdrawal Approved',
      `Your withdrawal request ${targetReq.id} for ₹${targetReq.amount.toLocaleString(
        'en-IN'
      )} has been approved by Treasury and is ready for payment dispatch.`,
      'withdrawal',
      targetReq.id
    );

    writeAdminLogDoc(
      'APPROVE_WITHDRAWAL',
      `Approved withdrawal of ₹${targetReq.amount.toLocaleString('en-IN')} for ${targetReq.userName}. Status: APPROVED.`,
      requestId
    );
  };

  // SUPER ADMIN ACTION 2: Mark Processing
  const adminMarkProcessing = (requestId: string, customUtr?: string) => {
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;
    sound.playSuccess();
    const nowIso = new Date().toISOString();

    const utr = (
      customUtr?.trim() ||
      `UTR${new Date().getFullYear().toString().slice(2)}${Math.floor(1000000000 + Math.random() * 9000000000)}`
    ).slice(0, 64);

    const nextTimeline = [
      ...targetReq.statusTimeline,
      {
        status: 'processing' as const,
        timestamp: nowIso,
        title: 'Dispatched to Banking Network',
        description: `Dispatched to ${
          targetReq.paymentMethod === 'upi' ? 'NPCI UPI' : 'RBI IMPS'
        } network with reference ${utr}.`,
        actor: 'Super Admin & Gateway Engine',
      },
    ].slice(0, 20);

    updateDoc(doc(db, 'withdrawals', requestId), {
      status: 'processing',
      utrNumber: utr,
      statusTimeline: nextTimeline,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${requestId}`));

    writeNotificationDoc(
      targetReq.userId,
      'Payout in Processing',
      `Your payout ${targetReq.id} is now processing in the banking rail with reference ${utr}.`,
      'withdrawal',
      targetReq.id
    );

    writeAdminLogDoc(
      'DISPATCH_PROCESSING',
      `Dispatched payout for ${targetReq.userName} (₹${targetReq.amount.toLocaleString(
        'en-IN'
      )}) to banking rails. Ref: ${utr}.`,
      requestId
    );
  };

  // SUPER ADMIN ACTION 3: Mark Completed (With optional Admin Note)
  const adminMarkCompleted = (requestId: string, utrNumber: string, adminNote?: string) => {
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) return;
    sound.playSuccess();
    const nowIso = new Date().toISOString();

    const finalUtr = (
      utrNumber.trim() ||
      targetReq.utrNumber ||
      `UTR${new Date().getFullYear().toString().slice(2)}${Math.floor(1000000000 + Math.random() * 9000000000)}`
    ).slice(0, 64);
    const cleanNote = adminNote?.trim().slice(0, 500);

    const nextTimeline = [
      ...targetReq.statusTimeline,
      {
        status: 'completed' as const,
        timestamp: nowIso,
        title: 'Payout Settled & Confirmed',
        description: `Bank transfer verified and confirmed by Treasury. UTR: ${finalUtr}.${
          cleanNote ? ` Admin Note: ${cleanNote}` : ''
        }`,
        actor: 'Super Admin / Core Settlement Node',
      },
    ].slice(0, 20);

    const targetUser = users.find((u) => u.id === targetReq.userId);
    const batch = writeBatch(db);
    const withdrawalUpdates: Record<string, unknown> = {
      status: 'completed',
      utrNumber: finalUtr,
      completedAt: nowIso,
      statusTimeline: nextTimeline,
      updatedAt: serverTimestamp(),
    };
    if (cleanNote) {
      withdrawalUpdates.adminNote = cleanNote;
    }
    batch.update(doc(db, 'withdrawals', requestId), withdrawalUpdates);
    if (targetUser) {
      batch.update(doc(db, 'users', targetUser.id), {
        pendingWithdrawals: Math.max(
          0,
          Math.round((targetUser.pendingWithdrawals - targetReq.amount) * 100) / 100
        ),
        totalWithdrawn: Math.round((targetUser.totalWithdrawn + targetReq.amount) * 100) / 100,
        updatedAt: serverTimestamp(),
      });
    }
    batch
      .commit()
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `withdrawals/${requestId}`));

    writeNotificationDoc(
      targetReq.userId,
      'Payout Settled & Completed',
      `₹${targetReq.netPayableAmount.toLocaleString(
        'en-IN'
      )} has been successfully transferred to your account. UTR: ${finalUtr}.`,
      'withdrawal',
      targetReq.id
    );

    writeAdminLogDoc(
      'SETTLE_COMPLETED',
      `Settled withdrawal of ₹${targetReq.amount.toLocaleString('en-IN')} for ${
        targetReq.userName
      }. Bank UTR: ${finalUtr}.`,
      requestId
    );
  };

  // SUPER ADMIN ACTION 4: Reject or Cancel & Refund Request (Supports pending/approved/processing AND completed withdrawals)
  const adminRejectRequest = (requestId: string, reason: string, adminNote?: string) => {
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq || targetReq.status === 'rejected' || targetReq.status === 'failed') return;
    sound.playWarning();
    const wasCompleted = targetReq.status === 'completed';
    const nowIso = new Date().toISOString();
    const cleanReason = (
      reason.trim() ||
      (wasCompleted ? 'Completed withdrawal cancelled & refunded by Admin' : 'Rejected by Admin')
    ).slice(0, 500);
    const cleanNote = adminNote !== undefined ? adminNote.trim().slice(0, 500) : undefined;
    const { refundFeeAmount, netRefundAmount } = calculateRefundFee(targetReq.amount);

    const feeNote =
      refundFeeAmount > 0
        ? `Refund fee of ₹${refundFeeAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} deducted; ₹${netRefundAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} restored to user available balance.`
        : `Full ₹${netRefundAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} restored to user available balance (0 refund fee).`;

    const nextTimeline = [
      ...targetReq.statusTimeline,
      {
        status: 'rejected' as const,
        timestamp: nowIso,
        title: wasCompleted
          ? 'Completed Withdrawal Cancelled & Refunded'
          : 'Withdrawal Rejected & Refunded',
        description: `Reason: ${cleanReason}. ${feeNote}${cleanNote ? ` Admin Note: ${cleanNote}` : ''}`,
        actor: 'Super Admin / Compliance',
      },
    ].slice(0, 20);

    const targetUser = users.find((u) => u.id === targetReq.userId);
    const batch = writeBatch(db);
    const withdrawalUpdates: Record<string, unknown> = {
      status: 'rejected',
      rejectionReason: cleanReason,
      refundFeeAmount,
      refundedAmount: netRefundAmount,
      statusTimeline: nextTimeline,
      updatedAt: serverTimestamp(),
    };
    if (cleanNote !== undefined) {
      withdrawalUpdates.adminNote = cleanNote ? cleanNote : deleteField();
    }
    batch.update(doc(db, 'withdrawals', requestId), withdrawalUpdates);

    if (targetUser) {
      const isSameDay =
        new Date(targetReq.createdAt).toDateString() === new Date().toDateString();
      const userUpdates: Record<string, unknown> = {
        availableBalance: Math.round((targetUser.availableBalance + netRefundAmount) * 100) / 100,
        updatedAt: serverTimestamp(),
      };
      if (wasCompleted) {
        userUpdates.totalWithdrawn = Math.max(
          0,
          Math.round((targetUser.totalWithdrawn - targetReq.amount) * 100) / 100
        );
      } else {
        userUpdates.pendingWithdrawals = Math.max(
          0,
          Math.round((targetUser.pendingWithdrawals - targetReq.amount) * 100) / 100
        );
      }
      if (isSameDay) {
        userUpdates.withdrawnToday = Math.max(
          0,
          Math.round((targetUser.withdrawnToday - targetReq.amount) * 100) / 100
        );
      }
      batch.update(doc(db, 'users', targetUser.id), userUpdates);
    }
    batch
      .commit()
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `withdrawals/${requestId}`));

    const actionWord = wasCompleted ? 'cancelled & refunded' : 'rejected';
    const notifTitle = wasCompleted
      ? 'Completed Withdrawal Cancelled & Refunded'
      : 'Withdrawal Rejected & Refunded';
    const noteSuffix = cleanNote ? ` Note: "${cleanNote}"` : '';

    writeNotificationDoc(
      targetReq.userId,
      notifTitle,
      refundFeeAmount > 0
        ? `Your withdrawal ${targetReq.id} for ₹${targetReq.amount.toLocaleString(
            'en-IN'
          )} was ${actionWord} (${cleanReason}). After a ₹${refundFeeAmount.toLocaleString(
            'en-IN'
          )} refund fee, ₹${netRefundAmount.toLocaleString(
            'en-IN'
          )} has been refunded to your wallet.${noteSuffix}`
        : `Your withdrawal ${targetReq.id} for ₹${targetReq.amount.toLocaleString(
            'en-IN'
          )} was ${actionWord} (${cleanReason}). The full ₹${netRefundAmount.toLocaleString(
            'en-IN'
          )} has been refunded to your wallet.${noteSuffix}`,
      'withdrawal',
      targetReq.id
    );

    writeAdminLogDoc(
      wasCompleted ? 'CANCEL_REFUND_COMPLETED_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
      `${wasCompleted ? 'Cancelled & refunded completed' : 'Rejected'} withdrawal of ₹${targetReq.amount.toLocaleString(
        'en-IN'
      )}. Reason: "${cleanReason}". Refund fee: ₹${refundFeeAmount.toLocaleString(
        'en-IN'
      )}; Net refunded: ₹${netRefundAmount.toLocaleString('en-IN')}.${
        cleanNote ? ` Admin Note: "${cleanNote}"` : ''
      }`,
      requestId
    );
  };

  // SUPER ADMIN ACTION 5: Delete Transaction History Record
  const deleteTransaction = (requestId: string, refundIfPending: boolean = true) => {
    sound.playWarning();
    const target = withdrawals.find((w) => w.id === requestId);
    if (!target) {
      return { success: false, error: 'Transaction record not found.' };
    }

    const targetUser = users.find((u) => u.id === target.userId);
    const batch = writeBatch(db);

    if (
      targetUser &&
      refundIfPending &&
      (target.status === 'pending' || target.status === 'approved' || target.status === 'processing')
    ) {
      batch.update(doc(db, 'users', targetUser.id), {
        availableBalance: Math.round((targetUser.availableBalance + target.amount) * 100) / 100,
        pendingWithdrawals: Math.max(
          0,
          Math.round((targetUser.pendingWithdrawals - target.amount) * 100) / 100
        ),
        withdrawnToday: Math.max(
          0,
          Math.round((targetUser.withdrawnToday - target.amount) * 100) / 100
        ),
        updatedAt: serverTimestamp(),
      });
    } else if (targetUser && target.status === 'completed') {
      batch.update(doc(db, 'users', targetUser.id), {
        totalWithdrawn: Math.max(
          0,
          Math.round((targetUser.totalWithdrawn - target.amount) * 100) / 100
        ),
        updatedAt: serverTimestamp(),
      });
    }

    batch.delete(doc(db, 'withdrawals', requestId));
    notifications
      .filter((n) => n.linkTxnId === requestId)
      .forEach((n) => batch.delete(doc(db, 'notifications', n.id)));

    batch
      .commit()
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `withdrawals/${requestId}`));

    writeAdminLogDoc(
      'DELETE_TRANSACTION_HISTORY',
      `Permanently deleted transaction ${requestId} (${target.status.toUpperCase()}, ₹${target.amount.toLocaleString(
        'en-IN'
      )}) for user ${target.userName} (${target.userId}). ${
        target.status === 'pending' || target.status === 'approved' || target.status === 'processing'
          ? `₹${target.amount.toLocaleString('en-IN')} reserved funds reversed to user balance.`
          : 'Historical ledger record purged.'
      }`,
      requestId
    );

    return { success: true };
  };

  // SUPER ADMIN ACTION 4B: Add / Edit / Clear Admin Message Note on ANY Withdrawal
  const updateWithdrawalAdminNote = (
    requestId: string,
    note: string,
    notifyUser: boolean = true
  ) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can add or edit withdrawal notes.' };
    }
    const targetReq = withdrawals.find((r) => r.id === requestId);
    if (!targetReq) {
      return { success: false, error: 'Withdrawal request not found.' };
    }

    const cleanNote = note.trim().slice(0, 500);
    sound.playSuccess();

    updateDoc(doc(db, 'withdrawals', requestId), {
      adminNote: cleanNote ? cleanNote : deleteField(),
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${requestId}`));

    writeAdminLogDoc(
      'WITHDRAWAL_NOTE_UPDATED',
      cleanNote
        ? `Added admin message note on withdrawal ${requestId} (${targetReq.userName}, ₹${targetReq.amount.toLocaleString(
            'en-IN'
          )}): "${cleanNote}"`
        : `Cleared admin message note on withdrawal ${requestId} (${targetReq.userName}).`,
      requestId
    );

    if (notifyUser && cleanNote) {
      writeNotificationDoc(
        targetReq.userId,
        `Admin Note on Withdrawal ${targetReq.id}`,
        cleanNote,
        'withdrawal',
        targetReq.id
      );
    }

    return { success: true };
  };

  // SUPER ADMIN: Balance Management
  const adjustUserBalance = ({
    userId,
    type,
    targetFund = 'availableBalance',
    amount,
    reason,
    pendingNote,
  }: {
    userId: string;
    type: 'increase' | 'decrease' | 'set_fixed';
    targetFund?: 'availableBalance' | 'dailyWithdrawalLimit' | 'withdrawnToday' | 'pendingWithdrawals' | 'totalWithdrawn';
    amount: number;
    reason: string;
    pendingNote?: string;
  }) => {
    if (!reason || reason.trim().length < 5) {
      sound.playWarning();
      return {
        success: false,
        error: 'A mandatory audit reason (minimum 5 characters) is required for all fund adjustments.',
      };
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
        return {
          success: false,
          error: `Cannot deduct ₹${amount}. Current fund value is only ₹${prevBal}. Negative values are prohibited.`,
        };
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
    const adjId = `ADJ-${nowIso.slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const targetFundNames: Record<string, string> = {
      availableBalance: 'Available Balance',
      dailyWithdrawalLimit: 'Daily Withdrawal Limit (Quota)',
      withdrawnToday: 'Used Limit Today',
      pendingWithdrawals: 'Pending Withdrawals Hold',
      totalWithdrawn: 'Total Withdrawn Lifetime',
    };
    const fundLabel = targetFundNames[targetFund] || 'Available Balance';
    const cleanReason = reason.trim().slice(0, 500);

    const adjustmentRecord: BalanceAdjustment = {
      id: adjId,
      userId,
      userName: targetUser.name.slice(0, 100),
      userEmail: targetUser.email.slice(0, 150),
      type,
      targetFund,
      previousBalance: prevBal,
      adjustmentAmount: delta,
      newBalance: newBal,
      reason: cleanReason,
      adminName: 'Super Admin',
      timestamp: nowIso,
    };

    const userUpdates: Record<string, unknown> = {
      [targetFund]: newBal,
      updatedAt: serverTimestamp(),
    };
    if (targetFund === 'availableBalance' && type === 'increase') {
      userUpdates.totalDeposited = Math.round((targetUser.totalDeposited + amount) * 100) / 100;
    }
    if (targetFund === 'pendingWithdrawals' && pendingNote !== undefined) {
      const cleanPendingNote = pendingNote.trim().slice(0, 500);
      userUpdates.pendingFundNote = cleanPendingNote ? cleanPendingNote : deleteField();
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId), userUpdates);
    batch.set(
      doc(db, 'adjustments', adjId),
      cleanUndefined({
        ...adjustmentRecord,
        createdAt: serverTimestamp(),
      })
    );
    batch
      .commit()
      .catch((err) => handleFirestoreError(err, OperationType.WRITE, `adjustments/${adjId}`));

    const actionDesc =
      type === 'increase'
        ? `credited ₹${amount.toLocaleString('en-IN')}`
        : type === 'decrease'
        ? `debited ₹${amount.toLocaleString('en-IN')}`
        : `set to ₹${amount.toLocaleString('en-IN')}`;

    writeNotificationDoc(
      userId,
      `${fundLabel} Adjustment`,
      `Super Admin ${actionDesc} for ${fundLabel}. Reason: "${cleanReason}". Updated value: ₹${newBal.toLocaleString(
        'en-IN'
      )}.`,
      'balance'
    );

    writeAdminLogDoc(
      'FUNDS_ADJUSTMENT',
      `${type.toUpperCase()} ${fundLabel} for ${targetUser.name} (${userId}). Previous: ₹${prevBal} -> New: ₹${newBal}. Reason: "${cleanReason}".`,
      userId
    );

    return { success: true, adjustment: adjustmentRecord };
  };

  // SUPER ADMIN: Add / Edit / Clear Pending Fund Message Note for any User
  const updatePendingFundNote = (userId: string, note: string, notifyUser: boolean = true) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can update pending fund notes.' };
    }
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'User account not found.' };
    }

    const cleanNote = note.trim().slice(0, 500);
    sound.playSuccess();

    updateDoc(doc(db, 'users', userId), {
      pendingFundNote: cleanNote ? cleanNote : deleteField(),
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`));

    writeAdminLogDoc(
      'PENDING_FUND_NOTE_UPDATED',
      cleanNote
        ? `Updated Pending Fund message note for ${targetUser.name} (${userId}, Pending: ₹${targetUser.pendingWithdrawals.toLocaleString(
            'en-IN'
          )}): "${cleanNote}"`
        : `Cleared Pending Fund message note for ${targetUser.name} (${userId}).`,
      userId
    );

    if (notifyUser && cleanNote) {
      writeNotificationDoc(
        userId,
        'Admin Note on Pending Funds',
        cleanNote,
        'balance'
      );
    }

    return { success: true };
  };

  // SUPER ADMIN: Upcoming Withdraw List CRUD
  const createUpcomingWithdrawal = ({
    targetUserId,
    title,
    withdrawalAmount,
    withdrawalCharge,
    scheduledDate,
    paymentMethod,
    status = 'upcoming',
    note,
    notifyUser = true,
  }: {
    targetUserId: string;
    title: string;
    withdrawalAmount: number;
    withdrawalCharge: number;
    scheduledDate: string;
    paymentMethod: 'upi' | 'bank_transfer' | 'any';
    status?: UpcomingWithdrawalStatus;
    note?: string;
    notifyUser?: boolean;
  }) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can create upcoming withdrawals.' };
    }
    const cleanTitle = title.trim().slice(0, 120);
    if (!cleanTitle) {
      return { success: false, error: 'Please enter a title or label for this upcoming withdrawal.' };
    }
    const amount = Math.round(Number(withdrawalAmount) * 100) / 100;
    const charge = Math.round(Number(withdrawalCharge) * 100) / 100;
    if (!amount || amount <= 0) {
      return { success: false, error: 'Withdrawal amount must be greater than ₹0.' };
    }
    if (isNaN(charge) || charge < 0 || charge > amount) {
      return { success: false, error: 'Withdrawal charge must be between ₹0 and the withdrawal amount.' };
    }

    const netAmount = Math.max(0, Math.round((amount - charge) * 100) / 100);
    const resolvedTargetId = targetUserId || 'ALL';
    const targetUser = resolvedTargetId === 'ALL' ? null : users.find((u) => u.id === resolvedTargetId);
    const targetUserName = (
      resolvedTargetId === 'ALL' ? 'All Users' : targetUser?.name || resolvedTargetId
    ).slice(0, 100);
    const cleanDate = (scheduledDate.trim() || new Date().toISOString().slice(0, 10)).slice(0, 50);
    const cleanNote = note?.trim().slice(0, 500) || undefined;
    const nowIso = new Date().toISOString();
    const id = `UPW-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newItem: UpcomingWithdrawal = {
      id,
      targetUserId: resolvedTargetId,
      targetUserName,
      title: cleanTitle,
      withdrawalAmount: amount,
      withdrawalCharge: charge,
      netAmount,
      scheduledDate: cleanDate,
      paymentMethod,
      status,
      note: cleanNote,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    sound.playSuccess();

    setDoc(
      doc(db, 'upcomingWithdrawals', id),
      cleanUndefined({
        ...newItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    ).catch((err) => handleFirestoreError(err, OperationType.CREATE, `upcomingWithdrawals/${id}`));

    writeAdminLogDoc(
      'CREATE_UPCOMING_WITHDRAWAL',
      `Scheduled upcoming withdrawal "${cleanTitle}" (${id}) for ${targetUserName}: Amount ₹${amount.toLocaleString(
        'en-IN'
      )}, Charge ₹${charge.toLocaleString('en-IN')}, Net ₹${netAmount.toLocaleString('en-IN')}, Date ${cleanDate}.`,
      id
    );

    if (notifyUser) {
      const notifMsg = `${cleanTitle}: ₹${amount.toLocaleString(
        'en-IN'
      )} (Withdrawal Charge: ₹${charge.toLocaleString('en-IN')} · Net: ₹${netAmount.toLocaleString(
        'en-IN'
      )}) scheduled for ${cleanDate}.${cleanNote ? ` Note: ${cleanNote}` : ''}`;

      if (resolvedTargetId === 'ALL') {
        users.forEach((u) => {
          writeNotificationDoc(u.id, 'New Upcoming Withdrawal Scheduled', notifMsg, 'withdrawal');
        });
      } else {
        writeNotificationDoc(resolvedTargetId, 'New Upcoming Withdrawal Scheduled', notifMsg, 'withdrawal');
      }
    }

    return { success: true, item: newItem };
  };

  const updateUpcomingWithdrawal = (
    id: string,
    updates: Partial<{
      targetUserId: string;
      title: string;
      withdrawalAmount: number;
      withdrawalCharge: number;
      scheduledDate: string;
      paymentMethod: 'upi' | 'bank_transfer' | 'any';
      status: UpcomingWithdrawalStatus;
      note: string;
    }>
  ) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can update upcoming withdrawals.' };
    }
    const existingItem = upcomingWithdrawals.find((item) => item.id === id);
    if (!existingItem) {
      return { success: false, error: 'Upcoming withdrawal item not found.' };
    }

    const nextAmount =
      updates.withdrawalAmount !== undefined
        ? Math.round(Number(updates.withdrawalAmount) * 100) / 100
        : existingItem.withdrawalAmount;
    const nextCharge =
      updates.withdrawalCharge !== undefined
        ? Math.round(Number(updates.withdrawalCharge) * 100) / 100
        : existingItem.withdrawalCharge;

    if (!nextAmount || nextAmount <= 0) {
      return { success: false, error: 'Withdrawal amount must be greater than ₹0.' };
    }
    if (isNaN(nextCharge) || nextCharge < 0 || nextCharge > nextAmount) {
      return { success: false, error: 'Withdrawal charge must be between ₹0 and the withdrawal amount.' };
    }

    const nextNet = Math.max(0, Math.round((nextAmount - nextCharge) * 100) / 100);
    const nextTargetId = updates.targetUserId ?? existingItem.targetUserId;
    const targetUser = nextTargetId === 'ALL' ? null : users.find((u) => u.id === nextTargetId);
    const nextTargetName = (
      nextTargetId === 'ALL' ? 'All Users' : targetUser?.name || existingItem.targetUserName || nextTargetId
    ).slice(0, 100);
    const nextTitle = (updates.title !== undefined ? updates.title.trim() : existingItem.title).slice(0, 120);
    if (!nextTitle) {
      return { success: false, error: 'Title cannot be empty.' };
    }

    const cleanNote =
      updates.note !== undefined ? updates.note.trim().slice(0, 500) : existingItem.note;

    const payload: Record<string, unknown> = {
      targetUserId: nextTargetId,
      targetUserName: nextTargetName,
      title: nextTitle,
      withdrawalAmount: nextAmount,
      withdrawalCharge: nextCharge,
      netAmount: nextNet,
      scheduledDate: (updates.scheduledDate ?? existingItem.scheduledDate).slice(0, 50),
      paymentMethod: updates.paymentMethod ?? existingItem.paymentMethod,
      status: updates.status ?? existingItem.status,
      note: cleanNote ? cleanNote : deleteField(),
      updatedAt: serverTimestamp(),
    };

    sound.playSuccess();
    updateDoc(doc(db, 'upcomingWithdrawals', id), payload).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `upcomingWithdrawals/${id}`)
    );

    writeAdminLogDoc(
      'UPDATE_UPCOMING_WITHDRAWAL',
      `Updated upcoming withdrawal "${nextTitle}" (${id}): Amount ₹${nextAmount.toLocaleString(
        'en-IN'
      )}, Charge ₹${nextCharge.toLocaleString('en-IN')}, Status: ${(updates.status ?? existingItem.status).toUpperCase()}.`,
      id
    );

    return { success: true };
  };

  const deleteUpcomingWithdrawal = (id: string) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can delete upcoming withdrawals.' };
    }
    const existingItem = upcomingWithdrawals.find((item) => item.id === id);
    if (!existingItem) {
      return { success: false, error: 'Upcoming withdrawal item not found.' };
    }

    sound.playWarning();
    deleteDoc(doc(db, 'upcomingWithdrawals', id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `upcomingWithdrawals/${id}`)
    );

    writeAdminLogDoc(
      'DELETE_UPCOMING_WITHDRAWAL',
      `Deleted upcoming withdrawal "${existingItem.title}" (${id}) for ${existingItem.targetUserName}.`,
      id
    );

    return { success: true };
  };

  // Super Admin: Update Fee Configuration (Withdrawal Fee + Refund Fee)
  const updateFeeConfig = (newConfig: Partial<FeeConfiguration>) => {
    sound.playSuccess();
    const merged: FeeConfiguration = {
      ...feeConfig,
      ...newConfig,
    };
    setDoc(
      doc(db, 'config', 'fees'),
      cleanUndefined({
        ...merged,
        updatedAt: serverTimestamp(),
      })
    ).catch((err) => handleFirestoreError(err, OperationType.WRITE, 'config/fees'));

    writeAdminLogDoc('FEE_CONFIG_UPDATED', `Updated platform withdrawal & refund fee policy: ${JSON.stringify(newConfig)}`);
  };

  // Super Admin: Toggle Emergency Killswitch
  const toggleWithdrawalsEnabled = (enabled?: boolean, notice?: string) => {
    sound.playWarning();
    const nextVal = enabled !== undefined ? enabled : !systemConfig.withdrawalsEnabled;
    const nextNotice = (notice !== undefined ? notice : systemConfig.maintenanceNotice || '').slice(0, 500);

    setDoc(
      doc(db, 'config', 'system'),
      cleanUndefined({
        ...systemConfig,
        withdrawalsEnabled: nextVal,
        maintenanceNotice: nextNotice,
        updatedAt: serverTimestamp(),
      })
    ).catch((err) => handleFirestoreError(err, OperationType.WRITE, 'config/system'));

    writeAdminLogDoc(
      nextVal ? 'ENABLE_WITHDRAWALS' : 'EMERGENCY_PAUSE_WITHDRAWALS',
      `Platform withdrawal status set to ${nextVal ? 'ENABLED' : 'PAUSED'}. Notice: "${nextNotice || 'None'}".`
    );
  };

  // App-Open Security Gate Actions
  const unlockAppWithCredentials = async (username: string, password: string) => {
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      sound.playWarning();
      return { success: false, error: 'Please enter both security username and password.' };
    }
    const valid = await verifySecurityCredentials(cleanUser, password, securityConfig);
    if (!valid) {
      sound.playWarning();
      return { success: false, error: 'Invalid security username or password.' };
    }
    sound.playSuccess();
    unlockedWithHashRef.current = securityConfig.passwordHash;
    setAppSecurityUnlocked(true);
    return { success: true };
  };

  const lockApp = () => {
    sound.playClick();
    unlockedWithHashRef.current = null;
    setAppSecurityUnlocked(false);
  };

  const updateAppSecurityConfig = async ({
    enabled,
    username,
    newPassword,
  }: {
    enabled: boolean;
    username: string;
    newPassword?: string;
  }) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can update app-open security credentials.' };
    }
    const cleanUsername = username.trim().slice(0, 64);
    if (cleanUsername.length < 3) {
      return { success: false, error: 'Security username must be at least 3 characters.' };
    }

    let nextSalt = securityConfig.passwordSalt;
    let nextHash = securityConfig.passwordHash;
    const rawPassword = newPassword ?? '';
    const hasNewPassword = rawPassword.length > 0;
    if (hasNewPassword) {
      if (rawPassword.length < 6) {
        return { success: false, error: 'New security password must be at least 6 characters.' };
      }
      nextSalt = generateSalt();
      nextHash = await hashSecurityPassword(rawPassword, nextSalt);
    }

    const updatedBy = (firebaseUser?.email || currentUser.name || 'Super Admin').slice(0, 150);
    const nextLocal: AppSecurityConfig = {
      enabled,
      username: cleanUsername,
      passwordSalt: nextSalt,
      passwordHash: nextHash,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    sound.playSuccess();
    unlockedWithHashRef.current = nextHash;
    setAppSecurityUnlocked(true);
    setSecurityConfig(nextLocal);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}security_gate`, JSON.stringify(nextLocal));
    } catch {
      // Ignore storage quota errors
    }

    try {
      await setDoc(doc(db, 'config', 'security'), {
        enabled,
        username: cleanUsername,
        passwordSalt: nextSalt,
        passwordHash: nextHash,
        updatedBy,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/security');
    }

    writeAdminLogDoc(
      'UPDATE_APP_SECURITY_GATE',
      `Updated App-Open Security Gate: status=${enabled ? 'ENABLED' : 'DISABLED'}, username="${cleanUsername}"${
        hasNewPassword ? ' (password rotated)' : ''
      }.`
    );

    return { success: true };
  };

  const resetAppSecurityToDefault = async (options?: { autoUnlock?: boolean }) => {
    if (!isAdminAccount) {
      return { success: false, error: 'Only Super Admin can reset app-open security credentials.' };
    }
    const autoUnlock = options?.autoUnlock !== false;
    const updatedBy = (firebaseUser?.email || currentUser.name || 'Super Admin').slice(0, 150);
    const nextLocal: AppSecurityConfig = {
      enabled: true,
      username: DEFAULT_SECURITY_CONFIG.username,
      passwordSalt: DEFAULT_SECURITY_CONFIG.passwordSalt,
      passwordHash: DEFAULT_SECURITY_CONFIG.passwordHash,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    sound.playSuccess();
    if (autoUnlock) {
      unlockedWithHashRef.current = DEFAULT_SECURITY_CONFIG.passwordHash;
      setAppSecurityUnlocked(true);
    } else {
      unlockedWithHashRef.current = null;
      setAppSecurityUnlocked(false);
    }
    setSecurityConfig(nextLocal);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}security_gate`, JSON.stringify(nextLocal));
    } catch {
      // Ignore storage quota errors
    }

    try {
      await setDoc(doc(db, 'config', 'security'), {
        enabled: true,
        username: DEFAULT_SECURITY_CONFIG.username,
        passwordSalt: DEFAULT_SECURITY_CONFIG.passwordSalt,
        passwordHash: DEFAULT_SECURITY_CONFIG.passwordHash,
        updatedBy,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/security');
    }

    writeAdminLogDoc(
      'RESET_APP_SECURITY_GATE',
      `Reset App-Open Security Gate to default username ("${DEFAULT_SECURITY_CONFIG.username}") and default password.`
    );

    return { success: true };
  };

  // Super Admin: Toggle Payment Method
  const togglePaymentMethod = (id: string) => {
    sound.playClick();
    const nextMethods = systemConfig.paymentMethods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    setDoc(
      doc(db, 'config', 'system'),
      cleanUndefined({
        ...systemConfig,
        paymentMethods: nextMethods,
        updatedAt: serverTimestamp(),
      })
    ).catch((err) => handleFirestoreError(err, OperationType.WRITE, 'config/system'));
  };

  // Super Admin: Freeze/Unfreeze account
  const toggleUserFrozenState = (userId: string) => {
    sound.playWarning();
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const newState = !targetUser.isFrozen;

    updateDoc(doc(db, 'users', userId), {
      isFrozen: newState,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`));

    writeAdminLogDoc(
      newState ? 'FREEZE_USER_ACCOUNT' : 'UNFREEZE_USER_ACCOUNT',
      `Account for ${targetUser.name} (${targetUser.email}) was ${newState ? 'FROZEN' : 'RESTORED'}.`,
      userId
    );

    writeNotificationDoc(
      userId,
      newState ? 'Account Restricted' : 'Account Restored',
      newState
        ? 'Your account has been temporarily restricted by compliance. Please contact support.'
        : 'Your account restrictions have been cleared. All payout features are active.',
      'security'
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
      const fallback =
        users.find((u) => u.id !== userId && u.role === 'user') ||
        users.find((u) => u.role === 'admin');
      if (fallback) {
        setCurrentUserId(fallback.id);
      }
    }

    sound.playWarning();

    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', userId));
    withdrawals.filter((w) => w.userId === userId).forEach((w) => batch.delete(doc(db, 'withdrawals', w.id)));
    notifications.filter((n) => n.userId === userId).forEach((n) => batch.delete(doc(db, 'notifications', n.id)));

    batch
      .commit()
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `users/${userId}`));

    writeAdminLogDoc(
      'DELETE_USER_PERMANENT',
      `Permanently removed user account ${target.name} (${target.email}, ID: ${userId}). Remaining wallet balance ₹${target.availableBalance.toLocaleString(
        'en-IN'
      )} removed from system.`,
      userId
    );

    return { success: true };
  };

  // Update Profile
  const updateUserProfile = (userId: string, updates: Partial<User>) => {
    sound.playSuccess();
    const safeUpdates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.name !== undefined) safeUpdates.name = updates.name.slice(0, 100);
    if (updates.phone !== undefined) safeUpdates.phone = updates.phone.slice(0, 30);
    if (updates.address !== undefined) safeUpdates.address = updates.address.slice(0, 300);
    if (updates.panNumber !== undefined) safeUpdates.panNumber = updates.panNumber.slice(0, 20);
    if (updates.avatarUrl !== undefined) safeUpdates.avatarUrl = updates.avatarUrl.slice(0, 500);

    updateDoc(doc(db, 'users', userId), safeUpdates).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`)
    );
    writeNotificationDoc(
      userId,
      'Profile Updated',
      'Your personal account profile details have been updated.',
      'system'
    );
  };

  // Register new user (Admin creates managed customer wallet in live Firestore)
  const registerNewUser = (name: string, email: string, phone: string) => {
    if (!name || !email || !phone) {
      return { success: false, error: 'Name, email, and phone are required.' };
    }
    if (!isAdminAccount) {
      return { success: false, error: 'Only authorized administrators can provision additional customer accounts.' };
    }
    sound.playSuccess();
    const newId = `usr_${Date.now().toString().slice(-6)}`;
    const newUser: User = {
      id: newId,
      name: name.slice(0, 100),
      email: email.slice(0, 150),
      phone: phone.slice(0, 30),
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
      isFrozen: false,
    };

    setDoc(doc(db, 'users', newId), {
      ...sanitizeUserForWrite(newUser),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `users/${newId}`));

    setCurrentUserId(newId);
    return { success: true, user: newUser };
  };

  // Admin-Only: Add Beneficiaries to any User
  const addBankBeneficiary = (userId: string, beneficiary: Omit<BankBeneficiary, 'id'>) => {
    if (!isAdminAccount) {
      sound.playWarning();
      return { success: false, error: 'Only Super Admin can add bank beneficiary accounts.' };
    }
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Target user account not found.' };
    }
    if (targetUser.bankBeneficiaries.length >= 10) {
      return { success: false, error: 'Maximum of 10 bank beneficiaries allowed per user.' };
    }

    sound.playSuccess();
    const shouldBeDefault = Boolean(beneficiary.isDefault) || targetUser.bankBeneficiaries.length === 0;
    const newBeneficiary: BankBeneficiary = {
      ...beneficiary,
      accountHolderName: beneficiary.accountHolderName.trim().slice(0, 100),
      accountNumber: beneficiary.accountNumber.trim().slice(0, 40),
      ifscCode: beneficiary.ifscCode.trim().toUpperCase().slice(0, 11),
      bankName: beneficiary.bankName.trim().slice(0, 100),
      branchName: beneficiary.branchName?.trim().slice(0, 120),
      isDefault: shouldBeDefault,
      id: `bnk_${Date.now()}`,
    };
    const existingList = shouldBeDefault
      ? targetUser.bankBeneficiaries.map((b) => ({ ...b, isDefault: false }))
      : targetUser.bankBeneficiaries;
    const updatedList = [newBeneficiary, ...existingList].slice(0, 10);

    updateDoc(doc(db, 'users', userId), {
      bankBeneficiaries: updatedList,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`));

    writeAdminLogDoc(
      'ADD_BANK_BENEFICIARY',
      `Admin assigned bank beneficiary ${newBeneficiary.bankName} (•••• ${newBeneficiary.accountNumber.slice(
        -4
      )}, IFSC ${newBeneficiary.ifscCode}) to user ${targetUser.name} (${userId}).`,
      userId
    );

    writeNotificationDoc(
      userId,
      'Bank Beneficiary Added by Admin',
      `Super Admin linked ${newBeneficiary.bankName} (•••• ${newBeneficiary.accountNumber.slice(-4)}) as a verified payout account on your profile.`,
      'security'
    );

    return { success: true };
  };

  const addUpiBeneficiary = (userId: string, beneficiary: Omit<UpiBeneficiary, 'id'>) => {
    if (!isAdminAccount) {
      sound.playWarning();
      return { success: false, error: 'Only Super Admin can add UPI beneficiary accounts.' };
    }
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Target user account not found.' };
    }
    if (targetUser.upiBeneficiaries.length >= 10) {
      return { success: false, error: 'Maximum of 10 UPI beneficiaries allowed per user.' };
    }

    sound.playSuccess();
    const shouldBeDefault = Boolean(beneficiary.isDefault) || targetUser.upiBeneficiaries.length === 0;
    const newBeneficiary: UpiBeneficiary = {
      ...beneficiary,
      upiId: beneficiary.upiId.trim().toLowerCase().slice(0, 100),
      holderName: beneficiary.holderName.trim().slice(0, 100),
      provider: beneficiary.provider.trim().slice(0, 60),
      isDefault: shouldBeDefault,
      id: `upi_${Date.now()}`,
    };
    const existingList = shouldBeDefault
      ? targetUser.upiBeneficiaries.map((u) => ({ ...u, isDefault: false }))
      : targetUser.upiBeneficiaries;
    const updatedList = [newBeneficiary, ...existingList].slice(0, 10);

    updateDoc(doc(db, 'users', userId), {
      upiBeneficiaries: updatedList,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`));

    writeAdminLogDoc(
      'ADD_UPI_BENEFICIARY',
      `Admin assigned UPI beneficiary ${newBeneficiary.upiId} (${newBeneficiary.provider}) to user ${targetUser.name} (${userId}).`,
      userId
    );

    writeNotificationDoc(
      userId,
      'UPI Beneficiary Added by Admin',
      `Super Admin linked ${newBeneficiary.upiId} as a verified UPI payout account on your profile.`,
      'security'
    );

    return { success: true };
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
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (accountType === 'bank') {
      const bnk = targetUser.bankBeneficiaries.find((b) => b.id === accountId);
      if (bnk) deletedIdentifier = `${bnk.bankName} (•••• ${bnk.accountNumber.slice(-4)})`;
      const updatedBanks = targetUser.bankBeneficiaries
        .filter((b) => b.id !== accountId)
        .map((b) => ({ ...b }));
      if (updatedBanks.length > 0 && !updatedBanks.some((b) => b.isDefault)) {
        updatedBanks[0].isDefault = true;
      }
      updates.bankBeneficiaries = updatedBanks.slice(0, 10);
    } else {
      const upi = targetUser.upiBeneficiaries.find((b) => b.id === accountId);
      if (upi) deletedIdentifier = upi.upiId;
      const updatedUpi = targetUser.upiBeneficiaries
        .filter((b) => b.id !== accountId)
        .map((b) => ({ ...b }));
      if (updatedUpi.length > 0 && !updatedUpi.some((b) => b.isDefault)) {
        updatedUpi[0].isDefault = true;
      }
      updates.upiBeneficiaries = updatedUpi.slice(0, 10);
    }

    updateDoc(doc(db, 'users', userId), updates).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`)
    );

    writeAdminLogDoc(
      'UPDATE_USER',
      `Admin deleted ${accountType.toUpperCase()} payout account "${deletedIdentifier}" for user ${targetUser.name} (${userId}). Reason: ${reason}`,
      userId
    );

    writeNotificationDoc(
      userId,
      'Payout Account Removed',
      `Your linked payout account (${deletedIdentifier}) was removed by Compliance/Admin. Reason: ${reason}. Only Super Admin can add or update beneficiary accounts on your profile.`,
      'security'
    );

    return { success: true };
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    updateDoc(doc(db, 'notifications', id), {
      read: true,
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`));
  };

  const markAllNotificationsRead = (userId: string) => {
    sound.playClick();
    const targets = notifications.filter((n) => n.userId === userId && !n.read);
    if (targets.length === 0) return;
    const batch = writeBatch(db);
    targets.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    });
    batch.commit().catch((err) => handleFirestoreError(err, OperationType.UPDATE, 'notifications'));
  };

  const clearAllNotifications = (userId: string) => {
    sound.playClick();
    const targets = notifications.filter((n) => n.userId === userId);
    if (targets.length === 0) return;
    const batch = writeBatch(db);
    targets.forEach((n) => batch.delete(doc(db, 'notifications', n.id)));
    batch.commit().catch((err) => handleFirestoreError(err, OperationType.DELETE, 'notifications'));
  };

  // Reset to default seed (Admin only)
  const resetToDefault = () => {
    if (!isAdminAccount) return;
    sound.playWarning();
    const batch = writeBatch(db);
    batch.set(doc(db, 'config', 'fees'), {
      ...INITIAL_FEE_CONFIG,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'config', 'system'), {
      ...INITIAL_SYSTEM_CONFIG,
      updatedAt: serverTimestamp(),
    });
    INITIAL_USERS.forEach((seedUser) => {
      batch.set(doc(db, 'users', seedUser.id), {
        ...sanitizeUserForWrite(seedUser),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    batch.commit().catch((err) => handleFirestoreError(err, OperationType.WRITE, 'resetToDefault'));
    writeAdminLogDoc('RESET_PLATFORM_DEFAULTS', 'Restored default fee configuration and demo user wallets.');
  };

  return (
    <FintechContext.Provider
      value={{
        firebaseUser,
        authReady,
        dbLoading,
        isAdminAccount,
        authError,
        signInWithGoogle,
        logout,
        currentUser,
        users,
        withdrawals,
        feeConfig,
        adminLogs,
        adjustments,
        notifications,
        systemConfig,
        upcomingWithdrawals,
        currentRole,
        theme,
        adminAuthenticated,
        setAdminAuthenticated,
        toggleTheme,
        switchRole,
        switchUser,
        calculateFee,
        calculateRefundFee,
        requestWithdrawal,
        verifyOtpAndSubmit,
        depositFunds,
        adminApproveRequest,
        adminMarkProcessing,
        adminMarkCompleted,
        adminRejectRequest,
        updateWithdrawalAdminNote,
        deleteTransaction,
        adjustUserBalance,
        updatePendingFundNote,
        createUpcomingWithdrawal,
        updateUpcomingWithdrawal,
        deleteUpcomingWithdrawal,
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
        securityConfig,
        appSecurityUnlocked,
        unlockAppWithCredentials,
        lockApp,
        updateAppSecurityConfig,
        resetAppSecurityToDefault,
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
