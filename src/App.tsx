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

function FintechAppCore() {
  const { currentRole, switchRole, withdrawals } = useFintech();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdraw' | 'beneficiaries' | 'admin'>('dashboard');

  // Global modals
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isBeneficiaryOpen, setIsBeneficiaryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isApkOpen, setIsApkOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<WithdrawalRequest | null>(null);
  const [receiptTxn, setReceiptTxn] = useState<WithdrawalRequest | null>(null);

  const handleSelectTxnId = (txnId: string) => {
    const found = withdrawals.find((w) => w.id === txnId);
    if (found) {
      setSelectedTxn(found);
    }
  };

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
        {currentRole === 'admin' || activeTab === 'admin' ? (
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
    <FintechProvider>
      <FintechAppCore />
    </FintechProvider>
  );
}
