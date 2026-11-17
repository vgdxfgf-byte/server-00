import React, { useState } from 'react';
import { useFintech } from '../context/FintechContext';
import { WithdrawalRequest, TransactionStatus } from '../types';
import { sound } from '../utils/audio';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  FileText,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Smartphone,
  Banknote,
  Percent,
  RotateCcw,
  Calculator,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';

import { WithdrawalModal } from './WithdrawalModal';
import { BeneficiaryModal } from './BeneficiaryModal';
import { TransactionReceiptModal } from './TransactionReceiptModal';
import { TransactionDetailsDrawer } from './TransactionDetailsDrawer';

interface UserDashboardProps {
  onOpenWithdrawModal?: () => void;
  onOpenWithdrawFromList?: (upcomingId: string) => void;
  onOpenBeneficiaryModal?: () => void;
  onSelectTransaction?: (tx: WithdrawalRequest) => void;
  onOpenReceipt?: (tx: WithdrawalRequest) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onOpenWithdrawModal,
  onOpenWithdrawFromList,
  onOpenBeneficiaryModal,
  onSelectTransaction,
  onOpenReceipt,
}) => {
  const { currentUser, withdrawals, upcomingWithdrawals, feeConfig, calculateFee, calculateRefundFee } = useFintech();
  const [feePreviewAmountStr, setFeePreviewAmountStr] = useState<string>('5000');

  // Internal modal states when not provided as props
  const [internalWithdrawOpen, setInternalWithdrawOpen] = useState(false);
  const [internalPreselectedUpcomingId, setInternalPreselectedUpcomingId] = useState<string | null>(null);
  const [internalBeneficiaryOpen, setInternalBeneficiaryOpen] = useState(false);
  const [internalSelectedTx, setInternalSelectedTx] = useState<WithdrawalRequest | null>(null);
  const [internalReceiptTx, setInternalReceiptTx] = useState<WithdrawalRequest | null>(null);

  const handleWithdrawClick = () => {
    if (onOpenWithdrawModal) {
      onOpenWithdrawModal();
    } else {
      sound.playClick();
      setInternalPreselectedUpcomingId(null);
      setInternalWithdrawOpen(true);
    }
  };

  const handleWithdrawFromListClick = (upcomingId: string) => {
    if (onOpenWithdrawFromList) {
      onOpenWithdrawFromList(upcomingId);
    } else {
      sound.playClick();
      setInternalPreselectedUpcomingId(upcomingId);
      setInternalWithdrawOpen(true);
    }
  };

  const handleBeneficiaryClick = () => {
    if (onOpenBeneficiaryModal) {
      onOpenBeneficiaryModal();
    } else {
      sound.playClick();
      setInternalBeneficiaryOpen(true);
    }
  };

  const handleTransactionClick = (tx: WithdrawalRequest) => {
    if (onSelectTransaction) {
      onSelectTransaction(tx);
    } else {
      sound.playClick();
      setInternalSelectedTx(tx);
    }
  };

  const handleReceiptClick = (tx: WithdrawalRequest) => {
    if (onOpenReceipt) {
      onOpenReceipt(tx);
    } else {
      sound.playClick();
      setInternalReceiptTx(tx);
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');

  // Filter transactions for current user
  const userWithdrawals = withdrawals.filter((w) => w.userId === currentUser.id);

  const filteredTransactions = userWithdrawals.filter((tx) => {
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesSearch =
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.utrNumber && tx.utrNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.paymentDetails.upiId && tx.paymentDetails.upiId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.paymentDetails.accountNumber && tx.paymentDetails.accountNumber.includes(searchQuery)) ||
      tx.amount.toString().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const dailyRemaining = Math.max(0, currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday);
  const availableForWithdrawal = Math.min(
    currentUser.availableBalance,
    feeConfig.maxWithdrawalAmountPerTxn,
    dailyRemaining
  );

  const dailyUsedPercent = Math.min(
    100,
    Math.round((currentUser.withdrawnToday / currentUser.dailyWithdrawalLimit) * 100)
  );

  // Live Withdrawal Fee & Refund Fee calculations (controlled by Admin)
  const previewAmount = Math.max(0, parseFloat(feePreviewAmountStr) || 0);
  const withdrawalFeePreview = calculateFee(previewAmount);
  const refundFeePreview = calculateRefundFee(previewAmount);

  const rejectedTxns = userWithdrawals.filter((tx) => tx.status === 'rejected');
  const activeOrCompletedTxns = userWithdrawals.filter((tx) => tx.status !== 'rejected');
  const totalWithdrawalFeesPaid = activeOrCompletedTxns.reduce(
    (sum, tx) => sum + (tx.feeAmount || 0) + (tx.gstAmount || 0),
    0
  );
  const totalRefundFeesCharged = rejectedTxns.reduce(
    (sum, tx) => sum + (tx.refundFeeAmount ?? 0),
    0
  );
  const totalRefundedNet = rejectedTxns.reduce(
    (sum, tx) => sum + (tx.refundedAmount ?? Math.max(0, tx.amount - (tx.refundFeeAmount ?? 0))),
    0
  );

  const withdrawalFeeFormulaLabel =
    feeConfig.feeType === 'flat'
      ? `Flat ₹${feeConfig.flatFee.toFixed(2)} per payout`
      : feeConfig.feeType === 'percentage'
      ? `${feeConfig.percentageFee}% of payout amount`
      : `₹${feeConfig.flatFee.toFixed(2)} + ${feeConfig.percentageFee}%`;

  const refundFeeEnabled = feeConfig.refundFeeEnabled !== false;
  const refundFeeType = feeConfig.refundFeeType || 'flat';
  const refundFlatFee = Number(feeConfig.refundFlatFee ?? 0);
  const refundPercentageFee = Number(feeConfig.refundPercentageFee ?? 0);
  const refundFeeFormulaLabel = !refundFeeEnabled
    ? 'Waived by Admin (₹0.00)'
    : refundFeeType === 'flat'
    ? `Flat ₹${refundFlatFee.toFixed(2)} per refund`
    : refundFeeType === 'percentage'
    ? `${refundPercentageFee}% of refund amount`
    : `₹${refundFlatFee.toFixed(2)} + ${refundPercentageFee}%`;

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Account Identity Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Server 03 Treasury Core
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{currentUser.id}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">KYC Verified</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Server 03 Financial Dashboard
          </h1>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleWithdrawClick}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw Funds</span>
          </button>
        </div>
      </div>

      {/* Main Executive Financial Cards (Clean Withdrawal Focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Available Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              ₹{currentUser.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total funds stored in your wallet ledger
            </p>
          </div>
        </div>

        {/* Card 2: Available for Withdrawal */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-5 shadow-xs transition-all hover:border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5">
              <span>Available for Withdrawal</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹{availableForWithdrawal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Max claimable today</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                Instant Payout
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Withdrawals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Total Withdrawn</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              ₹{currentUser.totalWithdrawn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Settled directly into bank & UPI accounts
            </p>
          </div>
        </div>

        {/* Card 4: Pending Withdrawals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Pending Payouts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              ₹{currentUser.pendingWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reserved in-transit / awaiting UTR
            </p>
            {currentUser.pendingFundNote && (
              <div className="mt-2.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold block text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Admin Pending Fund Note
                  </span>
                  <span className="break-words">{currentUser.pendingFundNote}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Limits & Beneficiaries Quick Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Quota Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daily Withdrawal Limit Compliance
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                RBI regulated threshold resets every midnight (00:00 IST)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                ₹{currentUser.withdrawnToday.toLocaleString('en-IN')} / ₹
                {currentUser.dailyWithdrawalLimit.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-400 ml-1">({dailyUsedPercent}%)</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dailyUsedPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${dailyUsedPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Remaining Quota Today:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
              ₹
              {Math.max(0, currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday).toLocaleString(
                'en-IN',
                { minimumFractionDigits: 2 }
              )}
            </span>
          </div>
        </div>

        {/* Beneficiaries Quick Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Linked Payout Accounts
              </span>
              <button
                onClick={handleBeneficiaryClick}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {currentUser.bankBeneficiaries.length} Banks · {currentUser.upiBeneficiaries.length} UPI VPAs (Admin Assigned)
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                {currentUser.bankBeneficiaries[0]
                  ? `${currentUser.bankBeneficiaries[0].bankName} (••••${currentUser.bankBeneficiaries[0].accountNumber.slice(-4)})`
                  : 'No primary bank'}
              </span>
            </div>
            <button
              onClick={handleBeneficiaryClick}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Withdrawal Fee & Refund Fee (Admin-Controlled Live Schedule) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Withdrawal Fee &amp; Refund Fee Schedule
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60">
                <ShieldCheck className="w-3 h-3" />
                Admin Controlled · Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time gateway withdrawal charges and rejected-payout refund fees configured by Treasury Admin
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <Calculator className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Estimate on ₹
            </span>
            <input
              type="number"
              min="0"
              value={feePreviewAmountStr}
              onChange={(e) => setFeePreviewAmountStr(e.target.value)}
              aria-label="Fee estimator amount in INR"
              className="w-24 bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none text-right"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Withdrawal Fee */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    Withdrawal Fee
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {withdrawalFeeFormulaLabel} + {feeConfig.gstRatePercent}% GST
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                {feeConfig.feeType.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Processing Fee</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{withdrawalFeePreview.feeAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  GST ({feeConfig.gstRatePercent}%)
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{withdrawalFeePreview.gstAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Net Payout</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  ₹{withdrawalFeePreview.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <span>
                Limits: ₹{feeConfig.minWithdrawalAmount.toLocaleString('en-IN')} – ₹
                {feeConfig.maxWithdrawalAmountPerTxn.toLocaleString('en-IN')}
              </span>
              <span className="font-mono">
                Paid in ledger:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  ₹{totalWithdrawalFeesPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>

          {/* Card B: Refund Fee */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    Refund Fee
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {refundFeeFormulaLabel}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                  refundFeeEnabled
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {refundFeeEnabled ? 'Active Fee' : '0 Fee / Free'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">If Refunded</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{previewAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Refund Fee</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  -₹{refundFeePreview.refundFeeAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Restored to Wallet</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{refundFeePreview.netRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <span>
                {rejectedTxns.length} {rejectedTxns.length === 1 ? 'refund' : 'refunds'} processed
              </span>
              <span className="font-mono">
                Refund fees:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  ₹{totalRefundFeesCharged.toFixed(2)}
                </strong>
                {rejectedTxns.length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 ml-1.5">
                    (Net ₹{totalRefundedNet.toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Withdraw List (Scheduled by Admin) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Withdraw List
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60">
                  {upcomingWithdrawals.filter((u) => u.status === 'upcoming' || u.status === 'ready').length} Scheduled
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scheduled withdrawals published by Admin showing exact withdrawal amount and withdrawal charge
              </p>
            </div>
          </div>
        </div>

        {upcomingWithdrawals.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No upcoming withdrawals scheduled at the moment
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              When Admin schedules an upcoming withdrawal for you, its amount and charge will appear here live.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {upcomingWithdrawals.map((item) => {
              const statusBadgeClass =
                item.status === 'ready'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : item.status === 'completed'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : item.status === 'cancelled'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';

              const statusLabel =
                item.status === 'ready'
                  ? 'Ready for Payout'
                  : item.status === 'completed'
                  ? 'Completed'
                  : item.status === 'cancelled'
                  ? 'Cancelled'
                  : 'Upcoming';

              const existingTx = userWithdrawals.find(
                (w) =>
                  w.upcomingWithdrawalId === item.id &&
                  w.status !== 'rejected' &&
                  w.status !== 'failed'
              );
              const isEligibleToWithdraw =
                (item.status === 'upcoming' || item.status === 'ready') && !existingTx;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.targetUserId === 'ALL'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {item.targetUserId === 'ALL' ? 'All Users' : 'Personal'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        Scheduled: {item.scheduledDate} ·{' '}
                        {item.paymentMethod === 'bank_transfer'
                          ? 'Bank IMPS/NEFT'
                          : item.paymentMethod === 'upi'
                          ? 'UPI Instant'
                          : 'Bank / UPI'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Withdrawal Amount</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹{item.withdrawalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Withdrawal Charge</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        -₹{item.withdrawalCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Net Receivable</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{item.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {item.note && (
                    <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="break-words">{item.note}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                    {existingTx ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Submitted ({existingTx.id})</span>
                      </span>
                    ) : isEligibleToWithdraw ? (
                      <>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ready for authorized withdrawal
                        </span>
                        <button
                          type="button"
                          onClick={() => handleWithdrawFromListClick(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Withdraw Now</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {item.status === 'completed' ? 'Payout closed' : 'Cancelled by Admin'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter & Search Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Withdrawal Ledger</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live transaction statuses, UTR references, and tax receipts
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Status Segmented Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium overflow-x-auto">
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Processing', value: 'processing' },
                { label: 'Completed', value: 'completed' },
                { label: 'Rejected', value: 'rejected' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    sound.playClick();
                    setStatusFilter(tab.value as any);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === tab.value
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TXN, UTR, Amount..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-5">Transaction ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Gross Amount</th>
                <th className="py-3 px-4 text-right">Fee + GST</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => handleTransactionClick(tx)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  {/* Transaction ID + UTR */}
                  <td className="py-3.5 px-5">
                    <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {tx.id}
                    </div>
                    {tx.utrNumber ? (
                      <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                        UTR: {tx.utrNumber}
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-slate-400">
                        Ref: {tx.referenceNumber}
                      </div>
                    )}
                    {tx.adminNote && (
                      <div className="mt-1 inline-flex items-start gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/50 text-[10px] text-blue-700 dark:text-blue-300 max-w-[220px]">
                        <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="truncate" title={tx.adminNote}>
                          {tx.adminNote}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                    <div>
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>

                  {/* Payment Method */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                      {tx.paymentMethod === 'upi' ? (
                        <>
                          <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                          <span>UPI</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>IMPS Bank</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate max-w-[140px]">
                      {tx.paymentMethod === 'upi'
                        ? tx.paymentDetails.upiId
                        : `${tx.paymentDetails.bankName || 'Bank'} (••${tx.paymentDetails.accountNumber?.slice(-4)})`}
                    </div>
                  </td>

                  {/* Gross Amount */}
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Fee + GST / Refund Fee */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {tx.status === 'rejected' ? (
                      <div>
                        <span className="text-rose-600 dark:text-rose-400">
                          -₹{(tx.refundFeeAmount ?? 0).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-400">Refund Fee</span>
                      </div>
                    ) : (
                      `-₹${(tx.feeAmount + tx.gstAmount).toFixed(2)}`
                    )}
                  </td>

                  {/* Net Payable / Net Refunded */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {tx.status === 'rejected' ? (
                      <div>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ₹{(tx.refundedAmount ?? Math.max(0, tx.amount - (tx.refundFeeAmount ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="block text-[10px] font-normal text-slate-400">Refunded</span>
                      </div>
                    ) : (
                      `₹${tx.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">{getStatusBadge(tx.status)}</td>

                  {/* Actions */}
                  <td className="py-3.5 px-5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleTransactionClick(tx)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-medium"
                      title="View audit trail"
                    >
                      Audit
                    </button>
                    <button
                      onClick={() => handleReceiptClick(tx)}
                      className="px-2.5 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors cursor-pointer text-xs font-semibold"
                      title="Download or print receipt"
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm font-medium">No withdrawal transactions found</p>
                    <p className="text-xs mt-1">Try resetting the filter or initiate your first withdrawal.</p>
                    <button
                      onClick={handleWithdrawClick}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Initiate Withdrawal</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Self-contained modals when invoked directly */}
      <WithdrawalModal
        isOpen={internalWithdrawOpen}
        preselectedUpcomingId={internalPreselectedUpcomingId}
        onClose={() => {
          setInternalWithdrawOpen(false);
          setInternalPreselectedUpcomingId(null);
        }}
      />
      <BeneficiaryModal
        isOpen={internalBeneficiaryOpen}
        onClose={() => setInternalBeneficiaryOpen(false)}
      />
      <TransactionReceiptModal
        transaction={internalReceiptTx}
        onClose={() => setInternalReceiptTx(null)}
      />
      <TransactionDetailsDrawer
        transaction={internalSelectedTx}
        onClose={() => setInternalSelectedTx(null)}
        onOpenReceipt={(tx) => {
          setInternalSelectedTx(null);
          setInternalReceiptTx(tx);
        }}
      />
    </div>
  );
};
