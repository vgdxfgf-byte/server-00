import React, { useState, useEffect } from 'react';
import { useFintech } from '../context/FintechContext';
import { lookupIfsc } from '../utils/bankLookup';
import { sound } from '../utils/audio';
import { X, Building2, Smartphone, Plus, CheckCircle2, RotateCw, Trash2 } from 'lucide-react';

interface BeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, addBankBeneficiary, addUpiBeneficiary } = useFintech();
  const [activeTab, setActiveTab] = useState<'banks' | 'upi'>('banks');
  const [isAddingBank, setIsAddingBank] = useState<boolean>(false);
  const [isAddingUpi, setIsAddingUpi] = useState<boolean>(false);

  // New Bank Form
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [holderName, setHolderName] = useState<string>(currentUser.name);
  const [branchName, setBranchName] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [bankError, setBankError] = useState<string>('');

  // New UPI Form
  const [upiId, setUpiId] = useState<string>('');
  const [upiHolderName, setUpiHolderName] = useState<string>(currentUser.name);
  const [upiProvider, setUpiProvider] = useState<string>('Google Pay');
  const [upiError, setUpiError] = useState<string>('');

  useEffect(() => {
    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (cleanIfsc.length === 11) {
      setIsLookingUp(true);
      lookupIfsc(cleanIfsc).then((res) => {
        setIsLookingUp(false);
        if (res) {
          setBankName(res.bankName);
          setBranchName(res.branchName);
          setBankError('');
        } else {
          setBankError('Invalid IFSC code or branch not found.');
        }
      });
    }
  }, [ifscCode]);

  if (!isOpen) return null;

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    setBankError('');
    if (!accountNumber || accountNumber.length < 8) {
      setBankError('Valid account number is required.');
      return;
    }
    if (!ifscCode || ifscCode.length !== 11) {
      setBankError('Valid 11-digit IFSC code is required.');
      return;
    }

    addBankBeneficiary({
      accountHolderName: holderName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      bankName: bankName || 'Commercial Bank',
      branchName: branchName || 'Authorized Branch',
      accountType: 'savings',
      isDefault: currentUser.bankBeneficiaries.length === 0,
    });

    setIsAddingBank(false);
    setAccountNumber('');
    setIfscCode('');
    setBranchName('');
  };

  const handleSaveUpi = (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError('');
    if (!upiId || !upiId.includes('@')) {
      setUpiError('Please enter a valid UPI address containing "@" (e.g. name@okhdfcbank).');
      return;
    }

    addUpiBeneficiary({
      upiId: upiId.toLowerCase().trim(),
      holderName: upiHolderName,
      provider: upiProvider,
      isDefault: currentUser.upiBeneficiaries.length === 0,
    });

    setIsAddingUpi(false);
    setUpiId('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Beneficiary Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage verified accounts for fast payouts</p>
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

        {/* Banks Tab */}
        {activeTab === 'banks' && (
          <div className="space-y-4">
            {!isAddingBank ? (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
                          {b.ifscCode} · {b.branchName || 'Main Branch'} · {b.accountHolderName}
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                  {currentUser.bankBeneficiaries.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No bank accounts linked yet.</p>
                  )}
                </div>

                <button
                  onClick={() => setIsAddingBank(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Link New Bank Account</span>
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveBank} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span>Add Bank Account</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingBank(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[11px] text-slate-500">IFSC Code</label>
                    {isLookingUp && (
                      <span className="text-[10px] text-blue-500 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 animate-spin" /> Lookup
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={11}
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0000060"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase text-xs"
                    required
                  />
                  {bankName && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      ✓ {bankName} — {branchName}
                    </p>
                  )}
                  {bankError && <p className="text-[11px] text-rose-500 mt-1">{bankError}</p>}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingBank(false)}
                    className="px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 cursor-pointer"
                  >
                    Save Account
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* UPI Tab */}
        {activeTab === 'upi' && (
          <div className="space-y-4">
            {!isAddingUpi ? (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                  {currentUser.upiBeneficiaries.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No UPI addresses linked yet.</p>
                  )}
                </div>

                <button
                  onClick={() => setIsAddingUpi(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New UPI ID</span>
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveUpi} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span>Add UPI Address</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingUpi(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">UPI ID / VPA</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                    required
                  />
                  {upiError && <p className="text-[11px] text-rose-500 mt-1">{upiError}</p>}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Provider App</label>
                  <select
                    value={upiProvider}
                    onChange={(e) => setUpiProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="Google Pay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="BHIM UPI">BHIM UPI</option>
                    <option value="Cred">Cred</option>
                    <option value="Bank App">Direct Bank App</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUpi(false)}
                    className="px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 cursor-pointer"
                  >
                    Save UPI
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
