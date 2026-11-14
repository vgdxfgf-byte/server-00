import React, { useState } from 'react';
import { useFintech } from '../context/FintechContext';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, ArrowDownLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { depositFunds, currentUser } = useFintech();
  const [amountStr, setAmountStr] = useState<string>('10000');
  const [method, setMethod] = useState<'UPI' | 'NetBanking' | 'DebitCard'>('UPI');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const amount = parseFloat(amountStr) || 0;

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    depositFunds(amount, method);
    setIsSuccess(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Deposit / Add Funds</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add funds to test wallet ledger balance</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Deposit Confirmed</h4>
            <p className="text-xs text-slate-500 font-mono">
              ₹{amount.toLocaleString('en-IN')} added to {currentUser.name}&apos;s wallet balance.
            </p>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="pt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Deposit Amount (INR ₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  max="500000"
                  step="500"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2">
              {[2000, 5000, 10000, 25000, 50000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setAmountStr(val.toString());
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer ${
                    amount === val
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  +₹{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Deposit Method
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['UPI', 'NetBanking', 'DebitCard'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setMethod(m);
                    }}
                    className={`py-2 px-3 rounded-lg border font-medium transition-colors cursor-pointer text-center ${
                      method === m
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {m === 'DebitCard' ? 'Debit Card' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Simulated Instant Payment Gateway with 256-bit encryption.</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Deposit ₹{amount.toLocaleString('en-IN')} Instantly
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
