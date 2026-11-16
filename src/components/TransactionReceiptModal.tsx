import React from 'react';
import { WithdrawalRequest } from '../types';
import { X, Printer, CheckCircle2, Clock, AlertCircle, Copy, Check, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/audio';

interface TransactionReceiptModalProps {
  transaction: WithdrawalRequest | null;
  onClose: () => void;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!transaction) return null;

  const handleCopy = (text: string) => {
    sound.playClick();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>PAID & SETTLED</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>PROCESSING IN BANKING RAIL</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>REJECTED & REFUNDED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>PENDING REVIEW</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-slate-900 dark:text-slate-100 print:border-none print:shadow-none print:p-0">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm tracking-wide">Payout Settlement Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="pt-6 space-y-6">
          {/* Header Brand & Status */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  S3
                </span>
                <span>Server 03 Financial</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Regulated Automated Clearing & Treasury Node
              </p>
            </div>
            <div className="text-right">
              {getStatusBadge()}
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Reference Numbers Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
              <div className="flex items-center gap-1.5 font-mono font-medium text-slate-900 dark:text-slate-200">
                <span>{transaction.id}</span>
                <button
                  onClick={() => handleCopy(transaction.id)}
                  className="cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white print:hidden"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {transaction.utrNumber && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Bank UTR Reference</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {transaction.utrNumber}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400">Channel Reference</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {transaction.referenceNumber}
              </span>
            </div>

            {transaction.adminNote && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="text-blue-700 dark:text-blue-300 font-semibold block mb-0.5">
                  Admin Message Note
                </span>
                <p className="text-slate-700 dark:text-slate-300">{transaction.adminNote}</p>
              </div>
            )}
          </div>

          {/* Beneficiary Details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Beneficiary Destination
            </h4>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Beneficiary Name</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {transaction.userName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment Channel</span>
                <span className="font-medium uppercase text-slate-900 dark:text-slate-200">
                  {transaction.paymentMethod === 'upi' ? 'UPI Instant Payout' : 'IMPS Bank Transfer'}
                </span>
              </div>
              {transaction.paymentMethod === 'upi' ? (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Virtual Payment Address</span>
                  <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                    {transaction.paymentDetails.upiId}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Destination Bank</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">
                      {transaction.paymentDetails.bankName || 'Commercial Bank'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Account Number</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">
                      •••• •••• {transaction.paymentDetails.accountNumber?.slice(-4) || '••••'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">IFSC Code</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200">
                      {transaction.paymentDetails.ifscCode}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Amount & Fee Breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Settlement Ledger Breakdown
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 flex justify-between border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-300">Requested Withdrawal Amount</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {transaction.status === 'rejected' ? (
                <>
                  <div className="p-3 flex justify-between border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Admin Refund Fee Deducted</span>
                    <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      - ₹{(transaction.refundFeeAmount ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 flex justify-between items-center text-sm font-bold">
                    <span className="text-emerald-900 dark:text-emerald-300">Net Amount Refunded to Wallet</span>
                    <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-base">
                      ₹{(transaction.refundedAmount ?? Math.max(0, transaction.amount - (transaction.refundFeeAmount ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 flex justify-between border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Platform Payout Fee</span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      - ₹{transaction.feeAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Applicable GST on Fee (18%)</span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      - ₹{transaction.gstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 flex justify-between items-center text-sm font-bold">
                    <span className="text-blue-900 dark:text-blue-300">Net Payable Amount</span>
                    <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 text-base">
                      ₹{transaction.netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Notes */}
          <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 text-center space-y-1">
            <p>This is a computer-generated settlement receipt and requires no physical signature.</p>
            <p>For any queries, quote Transaction ID: {transaction.id}</p>
          </div>
        </div>

        {/* Modal Bottom CTA */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 print:hidden">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print or Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
