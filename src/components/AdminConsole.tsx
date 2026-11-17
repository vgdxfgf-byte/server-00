import React, { useState } from 'react';
import { useFintech } from '../context/FintechContext';
import { AdminSection, AdminSidebar } from './AdminSidebar';
import { AnalyticsCharts } from './AnalyticsCharts';
import { sound } from '../utils/audio';
import {
  Shield,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Minus,
  Edit3,
  RefreshCw,
  Download,
  AlertOctagon,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  RotateCw,
  Building2,
  Smartphone,
  Check,
  Trash2,
  Percent,
  RotateCcw,
  MessageSquare,
  CalendarClock,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { WithdrawalRequest, User, BalanceAdjustment, UpcomingWithdrawal, UpcomingWithdrawalStatus } from '../types';

export const AdminConsole: React.FC<{ onExitAdmin: () => void }> = ({ onExitAdmin }) => {
  const {
    withdrawals,
    users,
    feeConfig,
    adminLogs,
    adjustments,
    systemConfig,
    adminApproveRequest,
    adminMarkProcessing,
    adminMarkCompleted,
    adminRejectRequest,
    updateWithdrawalAdminNote,
    adjustUserBalance,
    updatePendingFundNote,
    upcomingWithdrawals,
    createUpcomingWithdrawal,
    updateUpcomingWithdrawal,
    deleteUpcomingWithdrawal,
    securityConfig,
    updateAppSecurityConfig,
    resetAppSecurityToDefault,
    lockApp,
    updateFeeConfig,
    toggleWithdrawalsEnabled,
    toggleUserFrozenState,
    deletePayoutAccount,
    deleteTransaction,
    deleteUser,
    calculateRefundFee,
  } = useFintech();

  const [currentSection, setCurrentSection] = useState<AdminSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // UTR Modal / Prompt State for Mark Completed
  const [completingTxn, setCompletingTxn] = useState<WithdrawalRequest | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [completeNoteInput, setCompleteNoteInput] = useState('');

  // Admin Message Note Modal State (Withdrawals & Pending Funds)
  const [editingWithdrawalNote, setEditingWithdrawalNote] = useState<WithdrawalRequest | null>(null);
  const [withdrawalNoteText, setWithdrawalNoteText] = useState('');
  const [notifyWithdrawalNote, setNotifyWithdrawalNote] = useState(true);
  const [editingPendingNoteUser, setEditingPendingNoteUser] = useState<User | null>(null);
  const [pendingNoteText, setPendingNoteText] = useState('');
  const [notifyPendingNote, setNotifyPendingNote] = useState(true);
  const [noteSaveFeedback, setNoteSaveFeedback] = useState<string | null>(null);

  // Rejection / Cancel & Refund Modal State
  const [rejectingTxn, setRejectingTxn] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Account name mismatch or regulatory compliance review failure');
  const [rejectAdminNote, setRejectAdminNote] = useState('');

  // Delete Payout Account Modal State
  const [deletingPayoutAccount, setDeletingPayoutAccount] = useState<{
    userId: string;
    userName: string;
    accountType: 'bank' | 'upi';
    accountId: string;
    accountLabel: string;
  } | null>(null);
  const [deletePayoutReason, setDeletePayoutReason] = useState('Regulatory KYC audit or fraudulent account flag');
  const [payoutDeleteSuccess, setPayoutDeleteSuccess] = useState<string | null>(null);

  // Delete Withdrawal History Record Modal State
  const [deletingWithdrawHistory, setDeletingWithdrawHistory] = useState<WithdrawalRequest | null>(null);
  const [refundIfPendingCheck, setRefundIfPendingCheck] = useState<boolean>(true);
  const [withdrawDeleteSuccess, setWithdrawDeleteSuccess] = useState<string | null>(null);

  // Delete User Account Modal State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [userActionFeedback, setUserActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Balance Adjustment Form State
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [adjType, setAdjType] = useState<'increase' | 'decrease' | 'set_fixed'>('increase');
  const [adjTarget, setAdjTarget] = useState<'availableBalance' | 'dailyWithdrawalLimit' | 'withdrawnToday' | 'pendingWithdrawals' | 'totalWithdrawn'>('availableBalance');
  const [adjAmountStr, setAdjAmountStr] = useState<string>('5000');
  const [adjReason, setAdjReason] = useState<string>('Compliance Treasury Adjustment');
  const [adjPendingNote, setAdjPendingNote] = useState<string>('');
  const [adjFeedback, setAdjFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fee Config Form State (Withdrawal Fee + Refund Fee)
  const [feeForm, setFeeForm] = useState({
    feeType: feeConfig.feeType,
    flatFee: feeConfig.flatFee,
    percentageFee: feeConfig.percentageFee,
    gstRatePercent: feeConfig.gstRatePercent,
    minWithdrawalAmount: feeConfig.minWithdrawalAmount,
    maxWithdrawalAmountPerTxn: feeConfig.maxWithdrawalAmountPerTxn,
    dailyCeilingLimit: feeConfig.dailyCeilingLimit,
    refundFeeEnabled: feeConfig.refundFeeEnabled !== false,
    refundFeeType: feeConfig.refundFeeType || 'flat',
    refundFlatFee: feeConfig.refundFlatFee ?? 15,
    refundPercentageFee: feeConfig.refundPercentageFee ?? 0,
  });
  const [feeSaveSuccess, setFeeSaveSuccess] = useState(false);

  // Upcoming Withdraw List Form State
  const defaultUpcomingDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [editingUpcomingId, setEditingUpcomingId] = useState<string | null>(null);
  const [upcomingTargetUserId, setUpcomingTargetUserId] = useState<string>('ALL');
  const [upcomingTitle, setUpcomingTitle] = useState<string>('');
  const [upcomingAmountStr, setUpcomingAmountStr] = useState<string>('5000');
  const [upcomingChargeStr, setUpcomingChargeStr] = useState<string>('25');
  const [upcomingDate, setUpcomingDate] = useState<string>(defaultUpcomingDate);
  const [upcomingMethod, setUpcomingMethod] = useState<'bank_transfer' | 'upi' | 'any'>('bank_transfer');
  const [upcomingStatus, setUpcomingStatus] = useState<UpcomingWithdrawalStatus>('upcoming');
  const [upcomingNote, setUpcomingNote] = useState<string>('');
  const [upcomingNotifyUser, setUpcomingNotifyUser] = useState<boolean>(true);
  const [upcomingFeedback, setUpcomingFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDeleteUpcomingId, setConfirmDeleteUpcomingId] = useState<string | null>(null);

  // App-Open Security Gate Settings State
  const [secEnabled, setSecEnabled] = useState<boolean>(securityConfig.enabled);
  const [secUsername, setSecUsername] = useState<string>(securityConfig.username);
  const [secNewPassword, setSecNewPassword] = useState<string>('');
  const [secConfirmPassword, setSecConfirmPassword] = useState<string>('');
  const [secShowPasswords, setSecShowPasswords] = useState<boolean>(false);
  const [secSaving, setSecSaving] = useState<boolean>(false);
  const [secFeedback, setSecFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmResetDefaultSec, setConfirmResetDefaultSec] = useState<boolean>(false);

  React.useEffect(() => {
    setSecEnabled(securityConfig.enabled);
    setSecUsername(securityConfig.username);
  }, [securityConfig.enabled, securityConfig.username]);

  React.useEffect(() => {
    if (users.length > 0 && (!selectedUserId || !users.some((u) => u.id === selectedUserId))) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  React.useEffect(() => {
    setFeeForm({
      feeType: feeConfig.feeType,
      flatFee: feeConfig.flatFee,
      percentageFee: feeConfig.percentageFee,
      gstRatePercent: feeConfig.gstRatePercent,
      minWithdrawalAmount: feeConfig.minWithdrawalAmount,
      maxWithdrawalAmountPerTxn: feeConfig.maxWithdrawalAmountPerTxn,
      dailyCeilingLimit: feeConfig.dailyCeilingLimit,
      refundFeeEnabled: feeConfig.refundFeeEnabled !== false,
      refundFeeType: feeConfig.refundFeeType || 'flat',
      refundFlatFee: feeConfig.refundFlatFee ?? 15,
      refundPercentageFee: feeConfig.refundPercentageFee ?? 0,
    });
  }, [feeConfig]);

  // Summary Metrics
  const totalWithdrawnAll = users.reduce((acc, u) => acc + (u.totalWithdrawn || 0), 0);
  const totalPendingAll = withdrawals
    .filter((w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing')
    .reduce((acc, w) => acc + w.amount, 0);
  const totalUserBalanceAll = users.reduce((acc, u) => acc + (u.availableBalance || 0), 0);
  const pendingQueue = withdrawals.filter((w) => w.status === 'pending' || w.status === 'approved' || w.status === 'processing');

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesFilter = filterStatus === 'all' || w.status === filterStatus;
    const matchesSearch =
      w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.utrNumber && w.utrNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      w.amount.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTxn) return;
    const utr = utrInput.trim() || `UTR${Date.now().toString().slice(-10)}`;
    adminMarkCompleted(completingTxn.id, utr, completeNoteInput);
    setCompletingTxn(null);
    setUtrInput('');
    setCompleteNoteInput('');
  };

  const handleSaveWithdrawalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWithdrawalNote) return;
    const res = updateWithdrawalAdminNote(
      editingWithdrawalNote.id,
      withdrawalNoteText,
      notifyWithdrawalNote
    );
    if (res.success) {
      setNoteSaveFeedback(
        withdrawalNoteText.trim()
          ? `Saved admin message note on withdrawal ${editingWithdrawalNote.id}.`
          : `Cleared admin message note on withdrawal ${editingWithdrawalNote.id}.`
      );
      setEditingWithdrawalNote(null);
      setTimeout(() => setNoteSaveFeedback(null), 4000);
    }
  };

  const handleClearWithdrawalNote = () => {
    if (!editingWithdrawalNote) return;
    const res = updateWithdrawalAdminNote(editingWithdrawalNote.id, '', false);
    if (res.success) {
      setNoteSaveFeedback(`Cleared admin message note on withdrawal ${editingWithdrawalNote.id}.`);
      setEditingWithdrawalNote(null);
      setTimeout(() => setNoteSaveFeedback(null), 4000);
    }
  };

  const handleSavePendingNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPendingNoteUser) return;
    const res = updatePendingFundNote(
      editingPendingNoteUser.id,
      pendingNoteText,
      notifyPendingNote
    );
    if (res.success) {
      setNoteSaveFeedback(
        pendingNoteText.trim()
          ? `Saved Pending Fund note for ${editingPendingNoteUser.name}.`
          : `Cleared Pending Fund note for ${editingPendingNoteUser.name}.`
      );
      setEditingPendingNoteUser(null);
      setTimeout(() => setNoteSaveFeedback(null), 4000);
    }
  };

  const handleClearPendingNote = () => {
    if (!editingPendingNoteUser) return;
    const res = updatePendingFundNote(editingPendingNoteUser.id, '', false);
    if (res.success) {
      setNoteSaveFeedback(`Cleared Pending Fund note for ${editingPendingNoteUser.name}.`);
      setEditingPendingNoteUser(null);
      setTimeout(() => setNoteSaveFeedback(null), 4000);
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTxn) return;
    adminRejectRequest(rejectingTxn.id, rejectionReason, rejectAdminNote);
    setRejectingTxn(null);
    setRejectAdminNote('');
  };

  const handleDeletePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingPayoutAccount) return;
    const res = deletePayoutAccount(
      deletingPayoutAccount.userId,
      deletingPayoutAccount.accountType,
      deletingPayoutAccount.accountId,
      deletePayoutReason
    );
    if (res.success) {
      setPayoutDeleteSuccess(`Deleted ${deletingPayoutAccount.accountType.toUpperCase()} payout account "${deletingPayoutAccount.accountLabel}" for ${deletingPayoutAccount.userName}.`);
      setDeletingPayoutAccount(null);
      setTimeout(() => setPayoutDeleteSuccess(null), 4000);
    }
  };

  const handleDeleteWithdrawHistorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingWithdrawHistory) return;
    const targetId = deletingWithdrawHistory.id;
    const targetAmount = deletingWithdrawHistory.amount;
    const targetUserName = deletingWithdrawHistory.userName;
    const res = deleteTransaction(targetId, refundIfPendingCheck);
    if (res.success) {
      sound.playWarning();
      setWithdrawDeleteSuccess(`Permanently deleted withdrawal history record ${targetId} (₹${targetAmount.toLocaleString('en-IN')}) for ${targetUserName}.`);
      setDeletingWithdrawHistory(null);
      setTimeout(() => setWithdrawDeleteSuccess(null), 4000);
    }
  };

  const handleDeleteUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser) return;
    const targetName = deletingUser.name;
    const targetId = deletingUser.id;
    const res = deleteUser(targetId);
    if (res.success) {
      if (selectedUserId === targetId) {
        const nextUser = users.find((u) => u.id !== targetId);
        setSelectedUserId(nextUser?.id || '');
      }
      setUserActionFeedback({
        type: 'success',
        message: `Permanently deleted user ${targetName} (${targetId}) along with their payout accounts and withdrawal history.`,
      });
      setDeletingUser(null);
      setTimeout(() => setUserActionFeedback(null), 4500);
    } else {
      setUserActionFeedback({
        type: 'error',
        message: res.error || 'Unable to delete user account.',
      });
      setDeletingUser(null);
      setTimeout(() => setUserActionFeedback(null), 4500);
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjFeedback(null);
    const amount = parseFloat(adjAmountStr);
    if (isNaN(amount) || amount < 0) {
      setAdjFeedback({ type: 'error', message: 'Enter a valid amount.' });
      return;
    }

    const res = adjustUserBalance({
      userId: selectedUserId,
      type: adjType,
      targetFund: adjTarget,
      amount,
      reason: adjReason,
      pendingNote: adjTarget === 'pendingWithdrawals' && adjPendingNote.trim() ? adjPendingNote : undefined,
    });

    if (res.success) {
      setAdjFeedback({ type: 'success', message: 'Fund ledger updated and audited successfully.' });
      if (adjTarget === 'pendingWithdrawals') {
        setAdjPendingNote('');
      }
      setTimeout(() => setAdjFeedback(null), 3500);
    } else {
      setAdjFeedback({ type: 'error', message: res.error || 'Failed to adjust balance.' });
    }
  };

  const handleSaveFees = (e: React.FormEvent) => {
    e.preventDefault();
    updateFeeConfig(feeForm);
    setFeeSaveSuccess(true);
    sound.playSuccess();
    setTimeout(() => setFeeSaveSuccess(false), 2500);
  };

  const resetUpcomingForm = () => {
    setEditingUpcomingId(null);
    setUpcomingTargetUserId('ALL');
    setUpcomingTitle('');
    setUpcomingAmountStr('5000');
    setUpcomingChargeStr('25');
    setUpcomingDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setUpcomingMethod('bank_transfer');
    setUpcomingStatus('upcoming');
    setUpcomingNote('');
    setUpcomingNotifyUser(true);
  };

  const handleStartEditUpcoming = (item: UpcomingWithdrawal) => {
    setEditingUpcomingId(item.id);
    setUpcomingTargetUserId(item.targetUserId);
    setUpcomingTitle(item.title);
    setUpcomingAmountStr(item.withdrawalAmount.toString());
    setUpcomingChargeStr(item.withdrawalCharge.toString());
    setUpcomingDate(item.scheduledDate);
    setUpcomingMethod(item.paymentMethod);
    setUpcomingStatus(item.status);
    setUpcomingNote(item.note || '');
    setUpcomingFeedback(null);
  };

  const handleSaveUpcoming = (e: React.FormEvent) => {
    e.preventDefault();
    setUpcomingFeedback(null);
    const amount = parseFloat(upcomingAmountStr);
    const charge = parseFloat(upcomingChargeStr || '0');
    if (isNaN(amount) || amount <= 0) {
      setUpcomingFeedback({ type: 'error', message: 'Enter a valid withdrawal amount greater than ₹0.' });
      return;
    }
    if (isNaN(charge) || charge < 0 || charge > amount) {
      setUpcomingFeedback({ type: 'error', message: 'Withdrawal charge must be between ₹0 and the withdrawal amount.' });
      return;
    }

    if (editingUpcomingId) {
      const res = updateUpcomingWithdrawal(editingUpcomingId, {
        targetUserId: upcomingTargetUserId,
        title: upcomingTitle,
        withdrawalAmount: amount,
        withdrawalCharge: charge,
        scheduledDate: upcomingDate,
        paymentMethod: upcomingMethod,
        status: upcomingStatus,
        note: upcomingNote,
      });
      if (res.success) {
        setUpcomingFeedback({ type: 'success', message: `Updated upcoming withdrawal "${upcomingTitle.trim()}".` });
        resetUpcomingForm();
        setTimeout(() => setUpcomingFeedback(null), 4000);
      } else {
        setUpcomingFeedback({ type: 'error', message: res.error || 'Failed to update upcoming withdrawal.' });
      }
    } else {
      const res = createUpcomingWithdrawal({
        targetUserId: upcomingTargetUserId,
        title: upcomingTitle,
        withdrawalAmount: amount,
        withdrawalCharge: charge,
        scheduledDate: upcomingDate,
        paymentMethod: upcomingMethod,
        status: upcomingStatus,
        note: upcomingNote,
        notifyUser: upcomingNotifyUser,
      });
      if (res.success) {
        setUpcomingFeedback({
          type: 'success',
          message: `Published "${upcomingTitle.trim()}" to the live Upcoming Withdraw List.`,
        });
        resetUpcomingForm();
        setTimeout(() => setUpcomingFeedback(null), 4000);
      } else {
        setUpcomingFeedback({ type: 'error', message: res.error || 'Failed to create upcoming withdrawal.' });
      }
    }
  };

  const handleQuickStatusUpcoming = (id: string, status: UpcomingWithdrawalStatus) => {
    const res = updateUpcomingWithdrawal(id, { status });
    if (res.success) {
      setUpcomingFeedback({ type: 'success', message: `Updated upcoming item ${id} status to ${status.toUpperCase()}.` });
      setTimeout(() => setUpcomingFeedback(null), 3500);
    }
  };

  const handleConfirmDeleteUpcoming = (id: string) => {
    const res = deleteUpcomingWithdrawal(id);
    setConfirmDeleteUpcomingId(null);
    if (res.success) {
      if (editingUpcomingId === id) {
        resetUpcomingForm();
      }
      setUpcomingFeedback({ type: 'success', message: `Removed upcoming withdrawal ${id}.` });
      setTimeout(() => setUpcomingFeedback(null), 3500);
    }
  };

  const handleSaveSecurityGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecFeedback(null);
    if (secNewPassword.length > 0 && secNewPassword.length < 6) {
      setSecFeedback({ type: 'error', message: 'New security password must be at least 6 characters.' });
      return;
    }
    if (secNewPassword.length > 0 && secNewPassword !== secConfirmPassword) {
      setSecFeedback({ type: 'error', message: 'New password and confirmation password do not match.' });
      return;
    }
    setSecSaving(true);
    try {
      const res = await updateAppSecurityConfig({
        enabled: secEnabled,
        username: secUsername,
        newPassword: secNewPassword.length > 0 ? secNewPassword : undefined,
      });
      if (res.success) {
        setSecNewPassword('');
        setSecConfirmPassword('');
        setConfirmResetDefaultSec(false);
        setSecFeedback({
          type: 'success',
          message: 'New Security Username & Password saved and synced live across devices.',
        });
        setTimeout(() => setSecFeedback(null), 5000);
      } else {
        setSecFeedback({ type: 'error', message: res.error || 'Failed to update security settings.' });
      }
    } finally {
      setSecSaving(false);
    }
  };

  const handleResetSecurityToDefault = async () => {
    setSecFeedback(null);
    setSecSaving(true);
    try {
      const res = await resetAppSecurityToDefault({ autoUnlock: true });
      if (res.success) {
        setSecNewPassword('');
        setSecConfirmPassword('');
        setConfirmResetDefaultSec(false);
        setSecFeedback({
          type: 'success',
          message: 'Reset to default credentials (Username: server03 · Password: PayFlow@2026) and synced live.',
        });
        setTimeout(() => setSecFeedback(null), 6000);
      } else {
        setSecFeedback({ type: 'error', message: res.error || 'Failed to reset security credentials.' });
      }
    } finally {
      setSecSaving(false);
    }
  };

  const exportCsv = () => {
    sound.playClick();
    const headers = ['Txn ID', 'User ID', 'User Name', 'Amount (INR)', 'Fee', 'GST', 'Net Payable', 'Status', 'Method', 'UTR', 'Date'];
    const rows = withdrawals.map((w) => [
      w.id,
      w.userId,
      `"${w.userName}"`,
      w.amount,
      w.feeAmount,
      w.gstAmount,
      w.netPayableAmount,
      w.status,
      w.paymentMethod,
      w.utrNumber || 'N/A',
      w.createdAt,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Server_03_Withdrawals_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <AdminSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        onExitAdmin={onExitAdmin}
      />

      {/* Main Admin Content Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Server 03 Central Treasury & Compliance Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              Super Admin Command Console
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentSection('security');
              }}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Change Password</span>
            </button>

            <button
              onClick={exportCsv}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Ledger</span>
            </button>

            <button
              onClick={onExitAdmin}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Back to User App</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SECTION 1: OVERVIEW */}
        {currentSection === 'overview' && (
          <div className="space-y-6">
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Total User Balances</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-2">
                  ₹{totalUserBalanceAll.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">Stored across {users.length} active wallets</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-amber-500/20 rounded-2xl p-5 shadow-xs bg-gradient-to-br from-amber-500/5 to-transparent">
                <span className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Pending Liquidity Queue</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-2">
                  ₹{totalPendingAll.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">{pendingQueue.length} requests awaiting settlement</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Total Settled Payouts</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                  ₹{totalWithdrawnAll.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-400 mt-1">Cleared via IMPS / UPI rails</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Payout Rails Status</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${systemConfig.withdrawalsEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {systemConfig.withdrawalsEnabled ? 'ACTIVE (100%)' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">RBI IMPS & NPCI Gateway Ready</p>
              </div>
            </div>

            {/* Analytics Charts */}
            <AnalyticsCharts withdrawals={withdrawals} />

            {/* Immediate Pending Action Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Withdrawals Requiring Compliance Review</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review pending withdrawals, approve dispatch, or mark settled with UTR</p>
                </div>
                <button
                  onClick={() => setCurrentSection('withdrawals')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({withdrawals.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Txn ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Method / Destination</th>
                      <th className="py-3 px-4 text-right">Gross Amount</th>
                      <th className="py-3 px-4 text-right">Net Payable</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingQueue.slice(0, 5).map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">{w.id}</div>
                          {w.adminNote && (
                            <div
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] max-w-[180px]"
                              title={w.adminNote}
                            >
                              <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{w.adminNote}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold">{w.userName}</div>
                          <div className="text-[10px] text-slate-400">{w.userEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {w.paymentMethod === 'upi' ? `UPI: ${w.paymentDetails.upiId}` : `${w.paymentDetails.bankName} (A/C: ${w.paymentDetails.accountNumber})`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">₹{w.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400">
                          ₹{w.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {w.status === 'pending' && (
                            <button
                              onClick={() => adminApproveRequest(w.id)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {w.status === 'approved' && (
                            <button
                              onClick={() => adminMarkProcessing(w.id)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer"
                            >
                              Dispatch
                            </button>
                          )}
                          {(w.status === 'processing' || w.status === 'approved') && (
                            <button
                              onClick={() => {
                                setCompletingTxn(w);
                                setUtrInput('');
                                setCompleteNoteInput(w.adminNote || '');
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
                            >
                              Settle (UTR)
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingWithdrawalNote(w);
                              setWithdrawalNoteText(w.adminNote || '');
                              setNotifyWithdrawalNote(true);
                            }}
                            className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1 ${
                              w.adminNote
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60'
                                : 'bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600'
                            }`}
                            title={w.adminNote ? 'Edit withdrawal message note' : 'Add withdrawal message note'}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{w.adminNote ? 'Edit Note' : 'Note'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectingTxn(w);
                              setRejectionReason('Regulatory compliance review failure or name mismatch.');
                              setRejectAdminNote(w.adminNote || '');
                            }}
                            className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold text-xs transition cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setDeletingWithdrawHistory(w);
                              setRefundIfPendingCheck(true);
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete this withdrawal record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendingQueue.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          All withdrawal requests are settled or completed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: WITHDRAWAL QUEUE */}
        {currentSection === 'withdrawals' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Full Withdrawal Records</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage all transactions with live status overrides, compliance tracking, and history deletion</p>
              </div>

              {withdrawDeleteSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 text-xs font-semibold flex items-center justify-between border border-amber-200 dark:border-amber-800/60">
                  <span>{withdrawDeleteSuccess}</span>
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                </div>
              )}

              {noteSaveFeedback && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 text-xs font-semibold flex items-center justify-between border border-blue-200 dark:border-blue-800/60">
                  <span>{noteSaveFeedback}</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="text-xs text-slate-500">
                  Showing {filteredWithdrawals.length} of {withdrawals.length} transaction entries
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search ID, UTR, user..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4 text-right">Gross</th>
                      <th className="py-3 px-4 text-right">Net Paid</th>
                      <th className="py-3 px-4">UTR Reference</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold">{w.id}</div>
                          {w.adminNote && (
                            <div
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] max-w-[200px]"
                              title={w.adminNote}
                            >
                              <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{w.adminNote}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">{w.userName}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {w.paymentMethod === 'upi' ? w.paymentDetails.upiId : `${w.paymentDetails.bankName} - ${w.paymentDetails.accountNumber}`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">₹{w.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400">
                          ₹{w.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{w.utrNumber || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              w.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : w.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {w.status === 'pending' && (
                            <button
                              onClick={() => adminApproveRequest(w.id)}
                              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {(w.status === 'approved' || w.status === 'processing') && (
                            <button
                              onClick={() => {
                                setCompletingTxn(w);
                                setUtrInput('');
                                setCompleteNoteInput(w.adminNote || '');
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingWithdrawalNote(w);
                              setWithdrawalNoteText(w.adminNote || '');
                              setNotifyWithdrawalNote(true);
                            }}
                            className={`px-2 py-1 rounded font-semibold text-[11px] transition cursor-pointer inline-flex items-center gap-1 ${
                              w.adminNote
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60'
                                : 'bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600'
                            }`}
                            title={w.adminNote ? 'Edit admin message note' : 'Add admin message note'}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{w.adminNote ? 'Edit Note' : 'Note'}</span>
                          </button>
                          {w.status !== 'rejected' && w.status !== 'failed' && (
                            <button
                              onClick={() => {
                                setRejectingTxn(w);
                                setRejectionReason(
                                  w.status === 'completed'
                                    ? 'Completed payout cancelled & refunded by Super Admin.'
                                    : 'Compliance failure or regulatory check rejected.'
                                );
                                setRejectAdminNote(w.adminNote || '');
                              }}
                              className={`px-2 py-1 rounded font-semibold text-[11px] cursor-pointer ${
                                w.status === 'completed'
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/70 dark:hover:bg-amber-900/70 dark:text-amber-300'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900/70 dark:text-rose-300'
                              }`}
                              title={
                                w.status === 'completed'
                                  ? 'Cancel completed withdrawal, refund balance, and add note'
                                  : 'Reject withdrawal and refund balance'
                              }
                            >
                              {w.status === 'completed' ? 'Cancel & Refund' : 'Reject'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDeletingWithdrawHistory(w);
                              setRefundIfPendingCheck(w.status === 'pending' || w.status === 'approved' || w.status === 'processing');
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete this withdrawal history record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: BALANCE MANAGEMENT */}
        {currentSection === 'balances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Super Admin Fund Adjustment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Direct ledger modifications with mandatory immutable audit recording.
                </p>
              </div>

              {adjFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    adjFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {adjFeedback.message}
                </div>
              )}

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Select User Account
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.id}) — ₹{u.availableBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Target Fund Parameter
                  </label>
                  <select
                    value={adjTarget}
                    onChange={(e) => setAdjTarget(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="availableBalance">Available Balance (Spendable Funds)</option>
                    <option value="dailyWithdrawalLimit">Daily Withdrawal Limit Quota</option>
                    <option value="withdrawnToday">Used Limit Today</option>
                    <option value="pendingWithdrawals">Pending In-Flight Reserve</option>
                    <option value="totalWithdrawn">Total Lifetime Withdrawn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Adjustment Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjType('increase')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        adjType === 'increase'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      + Increase
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType('decrease')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        adjType === 'decrease'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      - Deduct
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType('set_fixed')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        adjType === 'set_fixed'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      = Set Fixed
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={adjAmountStr}
                    onChange={(e) => setAdjAmountStr(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-bold focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Compliance Audit Reason (Required)
                  </label>
                  <textarea
                    rows={2}
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. Approved compensation, dispute resolution, or treasury top-up"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {adjTarget === 'pendingWithdrawals' && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      Pending Fund Message Note (Optional · Visible to User)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={adjPendingNote}
                      onChange={(e) => setAdjPendingNote(e.target.value)}
                      placeholder="e.g. Pending bank clearing confirmation — estimated release within 2 hours"
                      className="w-full p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  Commit Fund Adjustment
                </button>
              </form>
            </div>

            {/* User Ledger Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Active User Balances, Pending Funds &amp; Notes</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Live ledger balances and Admin Pending Fund message notes across all accounts</p>
                </div>
              </div>

              {noteSaveFeedback && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 text-xs font-semibold flex items-center justify-between border border-blue-200 dark:border-blue-800/60">
                  <span>{noteSaveFeedback}</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4 text-right">Available Balance</th>
                      <th className="py-3 px-4 text-right">Pending Fund</th>
                      <th className="py-3 px-4">Pending Fund Note</th>
                      <th className="py-3 px-4 text-right">Total Settled</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{u.id}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{u.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          ₹{u.pendingWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {u.pendingFundNote ? (
                              <span
                                className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded max-w-[160px] truncate"
                                title={u.pendingFundNote}
                              >
                                {u.pendingFundNote}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No note</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPendingNoteUser(u);
                                setPendingNoteText(u.pendingFundNote || '');
                                setNotifyPendingNote(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                              title="Add or edit Pending Fund message note"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{u.pendingFundNote ? 'Edit' : 'Add Note'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                          ₹{u.totalWithdrawn.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              u.isFrozen
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {u.isFrozen ? 'Frozen' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3B: UPCOMING WITHDRAW LIST */}
        {currentSection === 'upcoming' && (() => {
          const parsedAmount = Math.max(0, parseFloat(upcomingAmountStr) || 0);
          const parsedCharge = Math.max(0, parseFloat(upcomingChargeStr) || 0);
          const previewNet = Math.max(0, Math.round((parsedAmount - parsedCharge) * 100) / 100);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create / Edit Upcoming Withdrawal Form */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{editingUpcomingId ? 'Edit Upcoming Withdrawal' : 'Add Upcoming Withdrawal'}</span>
                  </h3>
                  {editingUpcomingId && (
                    <button
                      type="button"
                      onClick={resetUpcomingForm}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Publish scheduled withdrawal items with exact withdrawal amount &amp; withdrawal charge directly to users.
                </p>

                {upcomingFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold mb-4 border ${
                      upcomingFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                    }`}
                  >
                    {upcomingFeedback.message}
                  </div>
                )}

                <form onSubmit={handleSaveUpcoming} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Target Audience
                    </label>
                    <select
                      value={upcomingTargetUserId}
                      onChange={(e) => setUpcomingTargetUserId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                    >
                      <option value="ALL">All Users (Broadcast Upcoming List)</option>
                      {users
                        .filter((u) => u.role !== 'admin')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Payout Title / Batch Label
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={upcomingTitle}
                      onChange={(e) => setUpcomingTitle(e.target.value)}
                      placeholder="e.g. Weekly Treasury Payout Batch #14"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Withdrawal Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={upcomingAmountStr}
                        onChange={(e) => setUpcomingAmountStr(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Withdrawal Charge (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={upcomingChargeStr}
                        onChange={(e) => setUpcomingChargeStr(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Net Payout to User:</span>
                    <span className="font-mono font-extrabold text-blue-700 dark:text-blue-300 text-sm">
                      ₹{previewNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Scheduled Date
                      </label>
                      <input
                        type="date"
                        required
                        value={upcomingDate}
                        onChange={(e) => setUpcomingDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Payout Rail
                      </label>
                      <select
                        value={upcomingMethod}
                        onChange={(e) => setUpcomingMethod(e.target.value as 'bank_transfer' | 'upi' | 'any')}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                      >
                        <option value="bank_transfer">Bank IMPS / NEFT</option>
                        <option value="upi">UPI Instant</option>
                        <option value="any">Bank or UPI (Any)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Schedule Status
                    </label>
                    <select
                      value={upcomingStatus}
                      onChange={(e) => setUpcomingStatus(e.target.value as UpcomingWithdrawalStatus)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                    >
                      <option value="upcoming">Upcoming (Scheduled)</option>
                      <option value="ready">Ready for Payout</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Admin Note (Optional · Visible in User App)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={upcomingNote}
                      onChange={(e) => setUpcomingNote(e.target.value)}
                      placeholder="e.g. Keep primary bank account verified before scheduled release."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>

                  {!editingUpcomingId && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={upcomingNotifyUser}
                        onChange={(e) => setUpcomingNotifyUser(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Send in-app notification to target user(s)</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingUpcomingId ? 'Save Upcoming Changes' : 'Publish to Upcoming Withdraw List'}</span>
                  </button>
                </form>
              </div>

              {/* Upcoming Withdraw List Table */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Live Upcoming Withdraw List ({upcomingWithdrawals.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Visible immediately inside the User App with withdrawal amount, withdrawal charge, and net payout.
                    </p>
                  </div>
                </div>

                {upcomingWithdrawals.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <CalendarClock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No upcoming withdrawals scheduled yet
                    </p>
                    <p className="text-xs mt-1">
                      Use the form on the left to add an upcoming withdrawal with amount and charge.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-3">Title &amp; Audience</th>
                          <th className="py-3 px-3">Date &amp; Rail</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                          <th className="py-3 px-3 text-right">Charge</th>
                          <th className="py-3 px-3 text-right">Net Payout</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {upcomingWithdrawals.map((item) => {
                          const statusBadge =
                            item.status === 'ready'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.status === 'completed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : item.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 align-top">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      item.targetUserId === 'ALL'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {item.targetUserId === 'ALL' ? 'All Users' : item.targetUserName}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">{item.id}</span>
                                </div>
                                {item.note && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 max-w-[220px] break-words">
                                    Note: {item.note}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                  {item.scheduledDate}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                                  {item.paymentMethod === 'bank_transfer'
                                    ? 'Bank IMPS/NEFT'
                                    : item.paymentMethod === 'upi'
                                    ? 'UPI Instant'
                                    : 'Bank / UPI'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                ₹{item.withdrawalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                -₹{item.withdrawalCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                ₹{item.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusBadge}`}>
                                  {item.status === 'ready' ? 'Ready' : item.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  {item.status === 'upcoming' && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusUpcoming(item.id, 'ready')}
                                      className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-bold cursor-pointer"
                                      title="Mark Ready for Payout"
                                    >
                                      Ready
                                    </button>
                                  )}
                                  {(item.status === 'upcoming' || item.status === 'ready') && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusUpcoming(item.id, 'completed')}
                                      className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[10px] font-bold cursor-pointer"
                                      title="Mark Completed"
                                    >
                                      Done
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditUpcoming(item)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                                    title="Edit item"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {confirmDeleteUpcomingId === item.id ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmDeleteUpcoming(item.id)}
                                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUpcomingId(item.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                      title="Delete item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* SECTION 4: USER DIRECTORY & PAYOUT ACCOUNTS */}
        {currentSection === 'users' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                User Directory & Linked Payout Accounts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View registered user details, manage KYC statuses, freeze/unfreeze accounts, and audit/delete user bank accounts or UPI VPAs.
              </p>
            </div>

            {payoutDeleteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
                <span>{payoutDeleteSuccess}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            )}

            {userActionFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  userActionFeedback.type === 'success'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <span>{userActionFeedback.message}</span>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/80">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>{u.name}</span>
                          {u.role === 'admin' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                              Admin
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{u.id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            u.isFrozen
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {u.isFrozen ? 'Frozen' : 'Active'}
                        </span>
                        <button
                          onClick={() => toggleUserFrozenState(u.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            u.isFrozen
                              ? 'bg-rose-600 text-white hover:bg-rose-500'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                          }`}
                        >
                          {u.isFrozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition cursor-pointer"
                            title={`Delete user ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Email:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 break-all">{u.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Phone:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{u.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">KYC Status:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                          {u.kycStatus}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Available Funds:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ₹{u.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px]">
                            Pending Fund:{' '}
                            <strong className="font-mono text-amber-600 dark:text-amber-400">
                              ₹{u.pendingWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
                          </span>
                          {u.pendingFundNote && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 truncate" title={u.pendingFundNote}>
                              Note: {u.pendingFundNote}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPendingNoteUser(u);
                            setPendingNoteText(u.pendingFundNote || '');
                            setNotifyPendingNote(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <MessageSquare className="w-3 h-3 text-amber-500" />
                          <span>{u.pendingFundNote ? 'Edit Pending Note' : 'Pending Note'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Linked Payout Accounts with Delete Controls */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                      {/* Bank Accounts */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Linked Bank Accounts ({u.bankBeneficiaries.length})</span>
                          </span>
                        </div>

                        {u.bankBeneficiaries.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No bank accounts linked.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {u.bankBeneficiaries.map((b) => (
                              <div
                                key={b.id}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                    <span>{b.bankName}</span>
                                    <span className="font-mono text-slate-400 text-[11px]">
                                      (•••• {b.accountNumber.slice(-4)})
                                    </span>
                                    {b.isDefault && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono truncate">
                                    IFSC: {b.ifscCode} · Holder: {b.accountHolderName}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingPayoutAccount({
                                      userId: u.id,
                                      userName: u.name,
                                      accountType: 'bank',
                                      accountId: b.id,
                                      accountLabel: `${b.bankName} (•••• ${b.accountNumber.slice(-4)})`,
                                    });
                                    setDeletePayoutReason('Regulatory KYC audit or invalid account details');
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                                  title="Delete this bank account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* UPI VPAs */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Linked UPI VPAs ({u.upiBeneficiaries.length})</span>
                          </span>
                        </div>

                        {u.upiBeneficiaries.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No UPI IDs linked.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {u.upiBeneficiaries.map((upi) => (
                              <div
                                key={upi.id}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-mono font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                    <span>{upi.upiId}</span>
                                    {upi.isDefault && (
                                      <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {upi.provider} · Holder: {upi.holderName}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingPayoutAccount({
                                      userId: u.id,
                                      userName: u.name,
                                      accountType: 'upi',
                                      accountId: upi.id,
                                      accountLabel: upi.upiId,
                                    });
                                    setDeletePayoutReason('Fraudulent VPA flag or user requested administrative cleanup');
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                                  title="Delete this UPI VPA"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: SETTINGS */}
        {currentSection === 'settings' && (() => {
          const sampleAmt = 5000;
          const draftWFeeRaw =
            feeForm.feeType === 'flat'
              ? feeForm.flatFee
              : feeForm.feeType === 'percentage'
              ? (sampleAmt * feeForm.percentageFee) / 100
              : feeForm.flatFee + (sampleAmt * feeForm.percentageFee) / 100;
          const draftWFee = Math.round(Math.max(0, draftWFeeRaw) * 100) / 100;
          const draftWGst = Math.round(((draftWFee * feeForm.gstRatePercent) / 100) * 100) / 100;
          const draftWNet = Math.max(0, Math.round((sampleAmt - draftWFee - draftWGst) * 100) / 100);

          const draftRFeeRaw = !feeForm.refundFeeEnabled
            ? 0
            : feeForm.refundFeeType === 'flat'
            ? feeForm.refundFlatFee
            : feeForm.refundFeeType === 'percentage'
            ? (sampleAmt * feeForm.refundPercentageFee) / 100
            : feeForm.refundFlatFee + (sampleAmt * feeForm.refundPercentageFee) / 100;
          const draftRFee = Math.min(sampleAmt, Math.round(Math.max(0, draftRFeeRaw) * 100) / 100);
          const draftRNet = Math.max(0, Math.round((sampleAmt - draftRFee) * 100) / 100);

          return (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Withdrawal Fee, Refund Fee &amp; Limits Configuration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Changes saved here sync live to every User Dashboard and apply immediately to withdrawals and rejected refunds.
                  </p>
                </div>

              {feeSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold">
                  Withdrawal fee, refund fee, and transaction limits updated live across all User Dashboards.
                </div>
              )}

              <form onSubmit={handleSaveFees} className="space-y-6">
                {/* Subsection 1: Withdrawal Fee & Limits */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Withdrawal Fee &amp; Payout Limits
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      ₹5,000 Preview: Fee ₹{draftWFee.toFixed(2)} + GST ₹{draftWGst.toFixed(2)} → Net{' '}
                      <strong className="text-blue-600 dark:text-blue-400">₹{draftWNet.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Withdrawal Fee Mode
                      </label>
                      <select
                        value={feeForm.feeType}
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            feeType: e.target.value as 'flat' | 'percentage' | 'flat_plus_percent',
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="flat">Flat Fee (₹)</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat_plus_percent">Flat + Percentage</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Flat Processing Fee (INR ₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={feeForm.flatFee}
                        onChange={(e) => setFeeForm({ ...feeForm, flatFee: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Percentage Platform Fee (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={feeForm.percentageFee}
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            percentageFee: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        GST on Withdrawal Fee (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={feeForm.gstRatePercent}
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            gstRatePercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Minimum Withdrawal (INR ₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={feeForm.minWithdrawalAmount}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, minWithdrawalAmount: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Max Per Transaction Limit (INR ₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={feeForm.maxWithdrawalAmountPerTxn}
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            maxWithdrawalAmountPerTxn: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Subsection 2: Refund Fee Policy */}
                <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Refund Fee Policy (User Dashboard &amp; Rejections)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Control whether a refund processing fee is charged when a withdrawal is rejected &amp; refunded
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFeeForm({ ...feeForm, refundFeeEnabled: !feeForm.refundFeeEnabled })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        feeForm.refundFeeEnabled
                          ? 'bg-amber-600 text-white hover:bg-amber-500'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {feeForm.refundFeeEnabled ? 'Refund Fee: ACTIVE' : 'Refund Fee: WAIVED (₹0)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Refund Fee Mode
                      </label>
                      <select
                        disabled={!feeForm.refundFeeEnabled}
                        value={feeForm.refundFeeType}
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            refundFeeType: e.target.value as 'flat' | 'percentage' | 'flat_plus_percent',
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                      >
                        <option value="flat">Flat Refund Fee (₹)</option>
                        <option value="percentage">Percentage Refund Fee (%)</option>
                        <option value="flat_plus_percent">Flat + Percentage</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Flat Refund Fee (INR ₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={!feeForm.refundFeeEnabled}
                        value={feeForm.refundFlatFee}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, refundFlatFee: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Percentage Refund Fee (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={!feeForm.refundFeeEnabled}
                        value={feeForm.refundPercentageFee}
                        onChange={(e) =>
                          setFeeForm({
                            ...feeForm,
                            refundPercentageFee: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span>₹5,000 Rejected Withdrawal Preview:</span>
                    <span>
                      Refund Fee:{' '}
                      <strong className="text-rose-600 dark:text-rose-400">-₹{draftRFee.toFixed(2)}</strong>
                      {' · '}
                      Net Restored to User Wallet:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        ₹{draftRNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Current live config: Withdrawal {feeConfig.feeType} · Refund{' '}
                    {feeConfig.refundFeeEnabled !== false ? feeConfig.refundFeeType || 'flat' : 'Waived'}
                  </span>
                  <button
                    type="submit"
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    Save Withdrawal &amp; Refund Fees
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Want to change your app-open security username or password?
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentSection('security')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Open Security &amp; Password</span>
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* SECTION 5B: SECURITY & PASSWORD */}
        {currentSection === 'security' && (
          <div className="max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Change App-Open Username &amp; Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update the security username and password required whenever someone opens or reloads the app. Saved as a salted SHA-256 hash in Cloud Firestore.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSecEnabled((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  secEnabled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                {secEnabled ? 'Security Gate: ENABLED' : 'Security Gate: DISABLED'}
              </button>
            </div>

            {secFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  secFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                }`}
              >
                {secFeedback.message}
              </div>
            )}

            <form onSubmit={handleSaveSecurityGate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Security Username
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={64}
                    value={secUsername}
                    onChange={(e) => setSecUsername(e.target.value)}
                    placeholder="e.g. server03"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    New Security Password
                  </label>
                  <div className="relative">
                    <input
                      type={secShowPasswords ? 'text' : 'password'}
                      minLength={6}
                      maxLength={64}
                      value={secNewPassword}
                      onChange={(e) => setSecNewPassword(e.target.value)}
                      placeholder="Min 6 chars (leave blank to keep)"
                      className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setSecShowPasswords((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={secShowPasswords ? 'Hide password' : 'Show password'}
                    >
                      {secShowPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={secShowPasswords ? 'text' : 'password'}
                    minLength={6}
                    maxLength={64}
                    value={secConfirmPassword}
                    onChange={(e) => setSecConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Active username: <strong className="font-mono text-slate-700 dark:text-slate-200">{securityConfig.username}</strong>
                  {' · '}Updated by {securityConfig.updatedBy}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!confirmResetDefaultSec ? (
                    <button
                      type="button"
                      onClick={() => setConfirmResetDefaultSec(true)}
                      disabled={secSaving}
                      className="py-2 px-3.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-xs font-semibold text-amber-800 dark:text-amber-300 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Default</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700">
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                        Restore default?
                      </span>
                      <button
                        type="button"
                        onClick={handleResetSecurityToDefault}
                        disabled={secSaving}
                        className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetDefaultSec(false)}
                        className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {securityConfig.enabled && (
                    <button
                      type="button"
                      onClick={lockApp}
                      className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Test Lock Now</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={secSaving}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    {secSaving ? 'Saving...' : 'Reset / Save New Credentials'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* SECTION 6: COMPLIANCE LOGS */}
        {currentSection === 'logs' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Compliance & Treasury Audit Trail</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Immutable log of approvals, dispatches, settlements, and fund adjustments</p>

            <div className="space-y-2">
              {adminLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{log.action}</span>
                      <span className="text-[10px] text-slate-400">by {log.adminName}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Complete Modal */}
      {completingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Confirm Gateway Settlement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mark withdrawal <span className="font-mono font-semibold">{completingTxn.id}</span> of ₹{completingTxn.netPayableAmount.toLocaleString('en-IN')} as Settled.
            </p>

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bank UTR / UPI Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC2026111298410"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Admin Message Note (Optional · Visible to User)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Dispatched via IMPS priority rail. Allow 15 mins to reflect."
                  value={completeNoteInput}
                  onChange={(e) => setCompleteNoteInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompletingTxn(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject / Cancel & Refund Modal */}
      {rejectingTxn && (() => {
        const { refundFeeAmount, netRefundAmount } = calculateRefundFee(rejectingTxn.amount);
        const isCompletedReversal = rejectingTxn.status === 'completed';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {isCompletedReversal
                  ? 'Cancel & Refund Completed Withdrawal'
                  : 'Reject & Refund Withdrawal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isCompletedReversal
                  ? `Cancelling this completed payout (${rejectingTxn.id}) reverses total withdrawn volume and credits the refund back to ${rejectingTxn.userName}'s wallet.`
                  : `Rejecting applies the Admin-configured Refund Fee policy before crediting ${rejectingTxn.userName}'s wallet.`}
              </p>

              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isCompletedReversal ? 'Settled Withdrawal:' : 'Requested Withdrawal:'}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    ₹{rejectingTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Admin Refund Fee:</span>
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                    -₹{refundFeeAmount.toFixed(2)}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                  <span className="text-slate-700 dark:text-slate-200">Net Refunded to Wallet:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{netRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isCompletedReversal ? 'Cancellation & Refund Reason (Audit record)' : 'Rejection Reason (Audit record)'}
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Admin Message Note (Optional · Visible to User)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Add a clear note for the user about this refund or cancellation..."
                    value={rejectAdminNote}
                    onChange={(e) => setRejectAdminNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="text-[10px] text-slate-400 mt-1 text-right">
                    {rejectAdminNote.length}/500
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingTxn(null);
                      setRejectAdminNote('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm ${
                      isCompletedReversal
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {isCompletedReversal
                      ? 'Confirm Cancel & Refund'
                      : 'Confirm Rejection & Refund'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Super Admin Delete User Payout Account Modal */}
      {deletingPayoutAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Delete User Payout Account
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You are about to remove this {deletingPayoutAccount.accountType.toUpperCase()} account for user{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {deletingPayoutAccount.userName}
              </strong>:
            </p>

            <div className="my-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Target Payout Destination
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block break-all">
                {deletingPayoutAccount.accountLabel}
              </span>
            </div>

            <form onSubmit={handleDeletePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Administrative Reason (Audit Log & User Notice)
                </label>
                <textarea
                  rows={2}
                  value={deletePayoutReason}
                  onChange={(e) => setDeletePayoutReason(e.target.value)}
                  placeholder="e.g. Account name mismatch, fraud flag, or regulatory audit requirement"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingPayoutAccount(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Delete User Withdrawal History Modal */}
      {deletingWithdrawHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Delete User Withdrawal History
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Permanently purge transaction record <span className="font-mono font-bold text-slate-900 dark:text-white">{deletingWithdrawHistory.id}</span> from platform ledger and user history:
            </p>

            <div className="my-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User Account:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {deletingWithdrawHistory.userName} ({deletingWithdrawHistory.userId})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gross Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{deletingWithdrawHistory.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {deletingWithdrawHistory.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Destination:</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  {deletingWithdrawHistory.paymentMethod === 'upi'
                    ? deletingWithdrawHistory.paymentDetails.upiId
                    : `${deletingWithdrawHistory.paymentDetails.bankName || 'Bank'} (•••• ${(deletingWithdrawHistory.paymentDetails.accountNumber || '').slice(-4)})`}
                </span>
              </div>
            </div>

            {/* If pending/approved/processing, option to restore reserved funds */}
            {(deletingWithdrawHistory.status === 'pending' ||
              deletingWithdrawHistory.status === 'approved' ||
              deletingWithdrawHistory.status === 'processing') && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={refundIfPendingCheck}
                    onChange={(e) => setRefundIfPendingCheck(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-amber-900 dark:text-amber-200 block">
                      Refund ₹{deletingWithdrawHistory.amount.toLocaleString('en-IN')} to User Wallet
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300">
                      Un-reserve locked in-flight funds and credit them back to the user&apos;s available balance.
                    </span>
                  </div>
                </label>
              </div>
            )}

            <form onSubmit={handleDeleteWithdrawHistorySubmit}>
              <p className="text-[11px] text-slate-400 mb-4">
                This deletion is immutable and recorded into compliance audit logs. The transaction will disappear from both the admin ledger and the user&apos;s history table.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingWithdrawHistory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Super Admin Delete User Account Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Permanently Delete User
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You are about to permanently delete{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{deletingUser.name}</strong> from the platform.
            </p>

            <div className="my-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{deletingUser.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{deletingUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Wallet Balance:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  ₹{deletingUser.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Linked Payout Accounts:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {deletingUser.bankBeneficiaries.length} Banks · {deletingUser.upiBeneficiaries.length} UPIs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Withdrawal Records:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {withdrawals.filter((w) => w.userId === deletingUser.id).length} transactions
                </span>
              </div>
            </div>

            <form onSubmit={handleDeleteUserSubmit}>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-4 font-medium">
                Warning: This permanently removes the user account, all linked bank/UPI payout accounts, and their withdrawal history, and logs the action in the Compliance Audit Trail.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User Permanently</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Withdrawal Message Note Modal */}
      {editingWithdrawalNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Withdrawal Message Note
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  {editingWithdrawalNote.id} · {editingWithdrawalNote.userName} · ₹
                  {editingWithdrawalNote.amount.toLocaleString('en-IN')} ({editingWithdrawalNote.status})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveWithdrawalNote} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Admin Message Note (Visible on User Dashboard, Audit &amp; Receipt)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={withdrawalNoteText}
                  onChange={(e) => setWithdrawalNoteText(e.target.value)}
                  placeholder="Write a clear message for this withdrawal (e.g. bank verification status, payout schedule, UTR note)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Under bank verification',
                    'Approved & queued for next IMPS batch',
                    'Settled successfully via priority rail',
                    'Awaiting additional compliance check',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawalNoteText(preset)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyWithdrawalNote}
                  onChange={(e) => setNotifyWithdrawalNote(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Send instant notification alert to {editingWithdrawalNote.userName}</span>
              </label>

              <div className="flex items-center justify-between gap-2 pt-1">
                {editingWithdrawalNote.adminNote ? (
                  <button
                    type="button"
                    onClick={handleClearWithdrawalNote}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    Clear Note
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingWithdrawalNote(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm"
                  >
                    Save Withdrawal Note
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Pending Fund Message Note Modal */}
      {editingPendingNoteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Pending Fund Message Note
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  {editingPendingNoteUser.name} · Pending Fund: ₹
                  {editingPendingNoteUser.pendingWithdrawals.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePendingNote} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Pending Fund Message Note (Displayed inside User&apos;s Pending Payouts Card)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={pendingNoteText}
                  onChange={(e) => setPendingNoteText(e.target.value)}
                  placeholder="Write a message about this user's pending funds (e.g. settlement timeline, hold reason, bank review)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'In-transit awaiting NPCI / bank settlement confirmation',
                    'Compliance hold — under routine verification',
                    'Scheduled for next clearing batch release',
                    'Pending bank holiday clearance',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPendingNoteText(preset)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyPendingNote}
                  onChange={(e) => setNotifyPendingNote(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Send instant notification alert to {editingPendingNoteUser.name}</span>
              </label>

              <div className="flex items-center justify-between gap-2 pt-1">
                {editingPendingNoteUser.pendingFundNote ? (
                  <button
                    type="button"
                    onClick={handleClearPendingNote}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    Clear Note
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPendingNoteUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-sm"
                  >
                    Save Pending Fund Note
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
