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
} from 'lucide-react';
import { WithdrawalRequest, User, BalanceAdjustment } from '../types';

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
    adjustUserBalance,
    updateFeeConfig,
    toggleWithdrawalsEnabled,
    toggleUserFrozenState,
    deletePayoutAccount,
    deleteTransaction,
    deleteUser,
  } = useFintech();

  const [currentSection, setCurrentSection] = useState<AdminSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // UTR Modal / Prompt State for Mark Completed
  const [completingTxn, setCompletingTxn] = useState<WithdrawalRequest | null>(null);
  const [utrInput, setUtrInput] = useState('');

  // Rejection Modal State
  const [rejectingTxn, setRejectingTxn] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Account name mismatch or regulatory compliance review failure');

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
  const [adjFeedback, setAdjFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fee Config Form State
  const [feeForm, setFeeForm] = useState({
    flatFee: feeConfig.flatFee,
    percentageFee: feeConfig.percentageFee,
    minWithdrawalAmount: feeConfig.minWithdrawalAmount,
    maxWithdrawalAmountPerTxn: feeConfig.maxWithdrawalAmountPerTxn,
    dailyCeilingLimit: feeConfig.dailyCeilingLimit,
  });
  const [feeSaveSuccess, setFeeSaveSuccess] = useState(false);

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
    adminMarkCompleted(completingTxn.id, utr);
    setCompletingTxn(null);
    setUtrInput('');
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTxn) return;
    adminRejectRequest(rejectingTxn.id, rejectionReason);
    setRejectingTxn(null);
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
    });

    if (res.success) {
      setAdjFeedback({ type: 'success', message: 'Fund ledger updated and audited successfully.' });
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

          <div className="flex items-center gap-2.5">
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
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">{w.id}</td>
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
                        <td className="py-3 px-4 text-right space-x-1.5">
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
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
                            >
                              Settle (UTR)
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setRejectingTxn(w);
                              setRejectionReason('Regulatory compliance review failure or name mismatch.');
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
                        <td className="py-3 px-4 font-mono font-semibold">{w.id}</td>
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
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {w.status === 'pending' && (
                            <button
                              onClick={() => adminApproveRequest(w.id)}
                              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px]"
                            >
                              Approve
                            </button>
                          )}
                          {(w.status === 'approved' || w.status === 'processing') && (
                            <button
                              onClick={() => {
                                setCompletingTxn(w);
                                setUtrInput('');
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                            >
                              Complete
                            </button>
                          )}
                          {w.status !== 'completed' && w.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setRejectingTxn(w);
                                setRejectionReason('Compliance failure or regulatory check rejected.');
                              }}
                              className="px-2 py-1 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold text-[11px]"
                            >
                              Reject
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
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Active User Balances & Daily Quotas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Live ledger balances across all registered accounts</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4 text-right">Available Balance</th>
                      <th className="py-3 px-4 text-right">Daily Limit Quota</th>
                      <th className="py-3 px-4 text-right">Withdrawn Today</th>
                      <th className="py-3 px-4 text-right">Total Settled</th>
                      <th className="py-3 px-4">Account Status</th>
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
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          ₹{u.dailyWithdrawalLimit.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                          ₹{u.withdrawnToday.toLocaleString('en-IN')}
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
        {currentSection === 'settings' && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Limits & Gateway Fee Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure global platform withdrawal minimums, limits, and transparent fees</p>
            </div>

            {feeSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold">
                Withdrawal parameters and fees updated successfully.
              </div>
            )}

            <form onSubmit={handleSaveFees} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Flat Processing Fee (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={feeForm.flatFee}
                    onChange={(e) => setFeeForm({ ...feeForm, flatFee: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Percentage Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={feeForm.percentageFee}
                    onChange={(e) => setFeeForm({ ...feeForm, percentageFee: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Minimum Withdrawal (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={feeForm.minWithdrawalAmount}
                    onChange={(e) => setFeeForm({ ...feeForm, minWithdrawalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Max Per Transaction Limit (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={feeForm.maxWithdrawalAmountPerTxn}
                    onChange={(e) => setFeeForm({ ...feeForm, maxWithdrawalAmountPerTxn: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Save Limits & Fees
              </button>
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

      {/* Reject Modal */}
      {rejectingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Reject & Refund Withdrawal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Rejecting will instantly return ₹{rejectingTxn.amount.toLocaleString('en-IN')} back to {rejectingTxn.userName}&apos;s wallet.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Rejection Reason (Audit record)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingTxn(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm"
                >
                  Confirm Rejection & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};
