import React, { useState } from 'react';
import { FintechProvider, useFintech } from './context/FintechContext';
import { Navbar } from './components/Navbar';
import { UserDashboard } from './components/UserDashboard';
import { AdminConsole } from './components/AdminConsole';
import { WithdrawalModal } from './components/WithdrawalModal';
import { BeneficiaryModal } from './components/BeneficiaryModal';
import { ProfileModal } from './components/ProfileModal';
import { ApkGuideModal } from './components/ApkGuideModal';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';
import { TransactionDetailsDrawer } from './components/TransactionDetailsDrawer';
import { WithdrawalRequest } from './types';
import { ShieldCheck, ArrowRight, RotateCw, AlertTriangle } from 'lucide-react';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Session Interrupted</h2>
            <p className="text-xs text-slate-400 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SignInGate() {
  const { signInWithGoogle, authError } = useFintech();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
            S3
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Server 03 · PayFlow</h1>
            <p className="text-xs text-slate-400">Live Treasury & Payout Platform</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white">Sign in to your account</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Authenticate with your verified Google account to access your live multi-device wallet ledger, linked payout destinations, and real-time settlement status.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
            {authError}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {signingIn ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Protected by Firebase Authentication & Cloud Firestore security rules
        </p>
      </div>
    </div>
  );
}

function FintechAppCore() {
  const {
    authReady,
    firebaseUser,
    dbLoading,
    isAdminAccount,
    currentRole,
    switchRole,
    withdrawals,
  } = useFintech();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdraw' | 'beneficiaries' | 'admin'>('dashboard');

  // Global modals
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isBeneficiaryOpen, setIsBeneficiaryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isApkOpen, setIsApkOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<WithdrawalRequest | null>(null);
  const [receiptTxn, setReceiptTxn] = useState<WithdrawalRequest | null>(null);

  if (!authReady || (firebaseUser && dbLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RotateCw className="w-7 h-7 text-blue-500 animate-spin" />
          <p className="text-xs font-medium text-slate-400">Syncing live ledger...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <SignInGate />;
  }

  const handleSelectTxnId = (txnId: string) => {
    const found = withdrawals.find((w) => w.id === txnId);
    if (found) {
      setSelectedTxn(found);
    }
  };

  const showAdminConsole = isAdminAccount && (currentRole === 'admin' || activeTab === 'admin');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Universal Server 03 Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWithdrawModal={() => setIsWithdrawOpen(true)}
        onOpenProfileModal={() => setIsProfileOpen(true)}
        onOpenApkModal={() => setIsApkOpen(true)}
        onSelectTxnId={handleSelectTxnId}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {showAdminConsole ? (
          <AdminConsole
            onExitAdmin={() => {
              switchRole('user');
              setActiveTab('dashboard');
            }}
          />
        ) : (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <UserDashboard
              onOpenWithdrawModal={() => setIsWithdrawOpen(true)}
              onOpenBeneficiaryModal={() => setIsBeneficiaryOpen(true)}
              onSelectTransaction={(tx) => setSelectedTxn(tx)}
              onOpenReceipt={(tx) => setReceiptTxn(tx)}
            />
          </div>
        )}
      </div>

      {/* Shared Modals */}
      <WithdrawalModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onTransactionCreated={(txnId) => {
          handleSelectTxnId(txnId);
        }}
      />

      <BeneficiaryModal
        isOpen={isBeneficiaryOpen || activeTab === 'beneficiaries'}
        onClose={() => {
          setIsBeneficiaryOpen(false);
          if (activeTab === 'beneficiaries') setActiveTab('dashboard');
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <ApkGuideModal
        isOpen={isApkOpen}
        onClose={() => setIsApkOpen(false)}
      />

      <TransactionDetailsDrawer
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onOpenReceipt={(tx) => {
          setSelectedTxn(null);
          setReceiptTxn(tx);
        }}
      />

      <TransactionReceiptModal
        transaction={receiptTxn}
        onClose={() => setReceiptTxn(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <FintechProvider>
        <FintechAppCore />
      </FintechProvider>
    </AppErrorBoundary>
  );
}
