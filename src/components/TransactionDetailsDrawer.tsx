import React from 'react';
import { WithdrawalRequest } from '../types';
import { useFintech } from '../context/FintechContext';
import { X, CheckCircle2, Clock, AlertCircle, Copy, Check, FileText, Trash2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface TransactionDetailsDrawerProps {
  transaction: WithdrawalRequest | null;
  onClose: () => void;
  onOpenReceipt: (tx: WithdrawalRequest) => void;
}

export const TransactionDetailsDrawer: React.FC<TransactionDetailsDrawerProps> = ({
  transaction,
  onClose,
  onOpenReceipt,
}) => {
  const { currentRole, deleteTransaction } = useFintech();
  const [copiedId, setCopiedId] = React.useState(false);
  const [copiedUtr, setCopiedUtr] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    setConfirmDelete(false);
  }, [transaction?.id]);

  if (!transaction) return null;

  const copyText = (text: string, type: 'id' | 'utr') => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'rejected':
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Transaction Audit</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{transaction.id}</p>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Main Amount Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Payout Amount</span>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
              ₹{transaction.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {getStatusIcon(transaction.status)}
              <span>{transaction.status}</span>
            </div>

            {transaction.rejectionReason && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-left">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block mb-1">
                  Rejection Reason & Action
                </span>
                <p className="text-xs text-rose-600 dark:text-rose-300">
                  {transaction.rejectionReason}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                  ✓ ₹{transaction.amount.toLocaleString('en-IN')} has been safely restored to your available balance.
                </p>
              </div>
            )}
          </div>

          {/* Quick Identifiers */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-800 dark:text-slate-200">{transaction.id}</span>
                <button
                  onClick={() => copyText(transaction.id, 'id')}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {transaction.utrNumber && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <span className="text-blue-700 dark:text-blue-300 font-medium">Bank UTR Reference</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{transaction.utrNumber}</span>
                  <button
                    onClick={() => copyText(transaction.utrNumber!, 'utr')}
                    className="cursor-pointer text-blue-400 hover:text-blue-600 dark:hover:text-blue-200"
                  >
                    {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fee & Tax Breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Fee & Deduction Breakdown
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Withdrawal Amount</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  ₹{transaction.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Platform Gateway Fee</span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  ₹{transaction.feeAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">GST on Platform Fee (18%)</span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  ₹{transaction.gstAmount.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Final Credited Amount</span>
                <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  ₹{transaction.netPayableAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Payout Destination
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Method</span>
                <span className="font-medium uppercase text-slate-800 dark:text-slate-200">
                  {transaction.paymentMethod === 'upi' ? 'UPI (Virtual Payment Address)' : 'Bank IMPS Transfer'}
                </span>
              </div>
              {transaction.paymentMethod === 'upi' ? (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">UPI ID</span>
                  <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                    {transaction.paymentDetails.upiId}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Bank Name</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {transaction.paymentDetails.bankName || 'Verified Bank'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Account Number</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      •••• •••• {transaction.paymentDetails.accountNumber?.slice(-4) || '••••'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">IFSC Code</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {transaction.paymentDetails.ifscCode}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Live Status Progression Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Status Progression Timeline
            </h4>
            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {transaction.statusTimeline.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      item.status === 'completed'
                        ? 'bg-emerald-500'
                        : item.status === 'rejected'
                        ? 'bg-rose-500'
                        : item.status === 'processing'
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                      Actor: {item.actor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            onClick={() => onOpenReceipt(transaction)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Official Receipt</span>
          </button>

          {currentRole === 'admin' && (
            confirmDelete ? (
              <button
                onClick={() => {
                  deleteTransaction(transaction.id, true);
                  setConfirmDelete(false);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                title="Confirm permanent deletion"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playWarning();
                  setConfirmDelete(true);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-colors cursor-pointer"
                title="Delete transaction record"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )
          )}

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-2.5 px-4 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
