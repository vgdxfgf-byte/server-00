import React, { useState } from 'react';
import { useFintech } from '../context/FintechContext';
import { sound } from '../utils/audio';
import { X, Building2, Smartphone, CheckCircle2, Lock } from 'lucide-react';

interface BeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdminAccount } = useFintech();
  const [activeTab, setActiveTab] = useState<'banks' | 'upi'>('banks');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Verified Beneficiary Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin-assigned payout accounts approved for withdrawals
              </p>
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

        {/* Admin-only management notice */}
        <div className="mt-4 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
          <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Admin-Controlled Directory:</span> Only Super Admin can add or remove verified Bank and UPI beneficiary accounts on your profile.
            {isAdminAccount && (
              <span className="block text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                To assign accounts to any user, open Super Admin → User Directory &amp; Payout Accounts.
              </span>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl my-4 text-xs font-semibold">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('banks');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'banks'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bank Accounts ({currentUser.bankBeneficiaries.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('upi');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upi'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>UPI VPAs ({currentUser.upiBeneficiaries.length})</span>
          </button>
        </div>

        {/* Banks Tab (Read-Only) */}
        {activeTab === 'banks' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentUser.bankBeneficiaries.map((b) => (
              <div
                key={b.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{b.bankName}</span>
                    <span className="font-mono text-slate-500 font-normal">
                      •••• {b.accountNumber.slice(-4)}
                    </span>
                    {b.isDefault && (
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {b.ifscCode} · {b.branchName || 'Authorized Branch'} · {b.accountHolderName}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
            ))}
            {currentUser.bankBeneficiaries.length === 0 && (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No bank accounts assigned by Admin yet.
              </div>
            )}
          </div>
        )}

        {/* UPI Tab (Read-Only) */}
        {activeTab === 'upi' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentUser.upiBeneficiaries.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{u.upiId}</span>
                    {u.isDefault && (
                      <span className="text-[10px] font-sans font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {u.holderName} · {u.provider}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
            ))}
            {currentUser.upiBeneficiaries.length === 0 && (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No UPI addresses assigned by Admin yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
