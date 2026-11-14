import React, { useState, useEffect } from 'react';
import { useFintech } from '../context/FintechContext';
import { PaymentMethodType, BankBeneficiary, UpiBeneficiary } from '../types';
import { lookupIfsc } from '../utils/bankLookup';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  X,
  ArrowRight,
  ShieldCheck,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Info,
} from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: (txnId: string) => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
}) => {
  const {
    currentUser,
    feeConfig,
    calculateFee,
    requestWithdrawal,
    verifyOtpAndSubmit,
  } = useFintech();

  // Wizard steps: 'amount' | 'destination' | 'otp' | 'success'
  const [step, setStep] = useState<'amount' | 'destination' | 'otp' | 'success'>('amount');

  // Amount inputs
  const [amountStr, setAmountStr] = useState<string>('5000');
  const amount = parseFloat(amountStr) || 0;

  // Payment Method
  const [method, setMethod] = useState<PaymentMethodType>('upi');

  // UPI fields
  const [selectedUpiId, setSelectedUpiId] = useState<string>(
    currentUser.upiBeneficiaries[0]?.upiId || ''
  );
  const [customUpiId, setCustomUpiId] = useState<string>('');
  const [saveUpiBeneficiary, setSaveUpiBeneficiary] = useState<boolean>(true);

  // Bank fields
  const [selectedBankId, setSelectedBankId] = useState<string>(
    currentUser.bankBeneficiaries[0]?.id || ''
  );
  const [isNewBank, setIsNewBank] = useState<boolean>(currentUser.bankBeneficiaries.length === 0);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [holderName, setHolderName] = useState<string>(currentUser.name);
  const [bankLookupResult, setBankLookupResult] = useState<{
    bankName: string;
    branchName: string;
  } | null>(null);
  const [isLookingUpIfsc, setIsLookingUpIfsc] = useState<boolean>(false);

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [createdTxnId, setCreatedTxnId] = useState<string>('');
  const [createdTxnRef, setCreatedTxnRef] = useState<string>('');

  // General error state
  const [formError, setFormError] = useState<string>('');

  // Live fee calculation
  const feeDetails = calculateFee(amount);

  // Handle IFSC lookup on change
  useEffect(() => {
    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (cleanIfsc.length === 11) {
      setIsLookingUpIfsc(true);
      lookupIfsc(cleanIfsc)
        .then((res) => {
          setBankLookupResult(res);
          setIsLookingUpIfsc(false);
        })
        .catch(() => {
          setIsLookingUpIfsc(false);
        });
    } else {
      setBankLookupResult(null);
    }
  }, [ifscCode]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setAmountStr('5000');
      setFormError('');
      setOtpError('');
      setEnteredOtp('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    sound.playClick();
    setAmountStr(val.toString());
    setFormError('');
  };

  const handleMaxBalance = () => {
    sound.playClick();
    const maxPoss = Math.min(
      currentUser.availableBalance,
      feeConfig.maxWithdrawalAmountPerTxn,
      currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday
    );
    setAmountStr(Math.max(0, Math.floor(maxPoss)).toString());
    setFormError('');
  };

  // Step 1 Validation -> Proceed to Destination
  const handleProceedToDestination = () => {
    sound.playClick();
    setFormError('');

    if (amount < feeConfig.minWithdrawalAmount) {
      setFormError(`Minimum withdrawal amount is ₹${feeConfig.minWithdrawalAmount.toLocaleString('en-IN')}.`);
      sound.playWarning();
      return;
    }

    if (amount > feeConfig.maxWithdrawalAmountPerTxn) {
      setFormError(`Maximum single withdrawal is ₹${feeConfig.maxWithdrawalAmountPerTxn.toLocaleString('en-IN')}.`);
      sound.playWarning();
      return;
    }

    if (amount > currentUser.availableBalance) {
      setFormError(`Insufficient available balance. You currently have ₹${currentUser.availableBalance.toLocaleString('en-IN')}.`);
      sound.playWarning();
      return;
    }

    const dailyRemaining = currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday;
    if (amount > dailyRemaining) {
      setFormError(`Daily ceiling reached. You can withdraw at most ₹${dailyRemaining.toLocaleString('en-IN')} today.`);
      sound.playWarning();
      return;
    }

    setStep('destination');
  };

  // Step 2 Validation -> Trigger OTP Generation & proceed to OTP
  const handleProceedToOtp = () => {
    sound.playClick();
    setFormError('');

    let paymentDetails: any = {};

    if (method === 'upi') {
      const finalUpi = customUpiId.trim() || selectedUpiId;
      if (!finalUpi) {
        setFormError('Please select or enter a valid UPI ID (e.g. yourname@okhdfcbank).');
        sound.playWarning();
        return;
      }
      if (!finalUpi.includes('@')) {
        setFormError('Invalid UPI ID format. A valid UPI ID must include "@" (e.g. name@okhdfcbank).');
        sound.playWarning();
        return;
      }
      paymentDetails = {
        upiId: finalUpi,
        holderName: currentUser.name,
      };
    } else {
      // Bank Transfer
      if (!isNewBank && selectedBankId) {
        const bank = currentUser.bankBeneficiaries.find((b) => b.id === selectedBankId);
        if (!bank) {
          setFormError('Selected beneficiary not found.');
          return;
        }
        paymentDetails = {
          accountNumber: bank.accountNumber,
          ifscCode: bank.ifscCode,
          bankName: bank.bankName,
          holderName: bank.accountHolderName,
          accountType: bank.accountType,
        };
      } else {
        if (!accountNumber || accountNumber.length < 8) {
          setFormError('Please enter a valid bank account number (at least 8 digits).');
          sound.playWarning();
          return;
        }
        if (accountNumber !== confirmAccountNumber) {
          setFormError('Account numbers do not match. Please re-check.');
          sound.playWarning();
          return;
        }
        if (!ifscCode || ifscCode.length !== 11) {
          setFormError('Please enter a valid 11-character bank IFSC code.');
          sound.playWarning();
          return;
        }
        paymentDetails = {
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          bankName: bankLookupResult?.bankName || 'Verified Bank Ltd',
          holderName: holderName || currentUser.name,
          accountType: 'savings',
        };
      }
    }

    // Submit withdrawal request to context (creates request, deducts balance, returns OTP)
    const res = requestWithdrawal({
      amount,
      paymentMethod: method,
      paymentDetails,
    });

    if (!res.success || !res.request || !res.otpCode) {
      setFormError(res.error || 'Failed to initiate withdrawal request.');
      return;
    }

    setCreatedTxnId(res.request.id);
    setCreatedTxnRef(res.request.referenceNumber);
    setGeneratedOtp(res.otpCode);
    setStep('otp');
  };

  // Step 3 Validation -> Confirm OTP
  const handleVerifyOtp = () => {
    setOtpError('');
    if (!enteredOtp || enteredOtp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      sound.playWarning();
      return;
    }

    const res = verifyOtpAndSubmit(createdTxnId, enteredOtp, generatedOtp);
    if (!res.success) {
      setOtpError(res.error || 'Invalid OTP code.');
      return;
    }

    // Trigger celebration
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 dark:text-slate-100 my-8">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {step === 'amount' && 'Initiate Payout Withdrawal'}
                {step === 'destination' && 'Select Payout Destination'}
                {step === 'otp' && 'Two-Factor Security Verification'}
                {step === 'success' && 'Withdrawal Dispatched Successfully'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'amount' && 'Enter desired amount and view real-time fee breakdown'}
                {step === 'destination' && 'Choose instant UPI rail or IMPS Bank Transfer'}
                {step === 'otp' && 'Authorize high-value transaction with encrypted 2FA OTP'}
                {step === 'success' && 'Your transaction is logged in the banking network'}
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

        {/* Wizard Step 1: Amount & Fee Calculation */}
        {step === 'amount' && (
          <div className="pt-5 space-y-5">
            {/* Balance notice */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
              <span className="text-slate-600 dark:text-slate-300">Available Payout Balance:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                ₹{currentUser.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Amount input box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Withdrawal Amount (INR ₹)
                </label>
                <span className="text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                  Limit: ₹{feeConfig.minWithdrawalAmount.toLocaleString('en-IN')} - ₹{feeConfig.maxWithdrawalAmountPerTxn.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={feeConfig.minWithdrawalAmount}
                  max={feeConfig.maxWithdrawalAmountPerTxn}
                  step="100"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setFormError('');
                  }}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent tabular-nums"
                />
              </div>
            </div>

            {/* Quick Amount Preset Chips */}
            <div className="flex flex-wrap gap-2">
              {[1000, 5000, 25000, 50000, 100000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer ${
                    amount === val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                >
                  +₹{val.toLocaleString('en-IN')}
                </button>
              ))}
              <button
                type="button"
                onClick={handleMaxBalance}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Max Balance
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Transparent Fee Breakdown Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Transparent Fee Breakdown</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {feeConfig.feeType === 'flat_plus_percent'
                    ? `Flat ₹${feeConfig.flatFee} + ${feeConfig.percentageFee}%`
                    : `Flat ₹${feeConfig.flatFee}`}
                </span>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Gross Withdrawal Amount</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    ₹{amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Processing Fee</span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    - ₹{feeDetails.feeAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    GST on Fee ({feeConfig.gstRatePercent}%)
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    - ₹{feeDetails.gstAmount.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-sm">
                  <span className="text-slate-900 dark:text-white">Net Payable to Your Account</span>
                  <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 text-base">
                    ₹{feeDetails.netPayableAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedToDestination}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Payout Destination</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Payment Destination Selection */}
        {step === 'destination' && (
          <div className="pt-5 space-y-5">
            {/* Method Segmented Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMethod('upi');
                  setFormError('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  method === 'upi'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Instant (VPA)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMethod('bank_transfer');
                  setFormError('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  method === 'bank_transfer'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Bank IMPS Transfer</span>
              </button>
            </div>

            {/* UPI Options */}
            {method === 'upi' && (
              <div className="space-y-4">
                {currentUser.upiBeneficiaries.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Saved UPI Beneficiaries
                    </label>
                    <div className="space-y-2">
                      {currentUser.upiBeneficiaries.map((upi) => (
                        <label
                          key={upi.id}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            selectedUpiId === upi.upiId && !customUpiId
                              ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="upiSelection"
                              checked={selectedUpiId === upi.upiId && !customUpiId}
                              onChange={() => {
                                setSelectedUpiId(upi.upiId);
                                setCustomUpiId('');
                              }}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                {upi.upiId}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {upi.holderName} · {upi.provider}
                              </div>
                            </div>
                          </div>
                          {upi.isDefault && (
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enter new UPI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {currentUser.upiBeneficiaries.length > 0 ? 'Or Enter Another UPI ID' : 'Enter UPI ID'}
                  </label>
                  <input
                    type="text"
                    value={customUpiId}
                    onChange={(e) => {
                      setCustomUpiId(e.target.value);
                      if (e.target.value) setSelectedUpiId('');
                      setFormError('');
                    }}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accepts handles from Google Pay, PhonePe, Paytm, BHIM, and all Indian banks.
                  </p>
                </div>
              </div>
            )}

            {/* Bank Transfer Options */}
            {method === 'bank_transfer' && (
              <div className="space-y-4">
                {currentUser.bankBeneficiaries.length > 0 && !isNewBank && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Saved Bank Accounts
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsNewBank(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        + Add New Account
                      </button>
                    </div>
                    <div className="space-y-2">
                      {currentUser.bankBeneficiaries.map((b) => (
                        <label
                          key={b.id}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            selectedBankId === b.id
                              ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="bankSelection"
                              checked={selectedBankId === b.id}
                              onChange={() => setSelectedBankId(b.id)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{b.bankName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  •••• {b.accountNumber.slice(-4)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                IFSC: {b.ifscCode} · {b.accountHolderName}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Bank Form */}
                {(isNewBank || currentUser.bankBeneficiaries.length === 0) && (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Enter Bank Account Details
                      </span>
                      {currentUser.bankBeneficiaries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsNewBank(false)}
                          className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                        >
                          Back to saved
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        placeholder="Full name as on bank passbook"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          Account Number
                        </label>
                        <input
                          type="password"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="e.g. 50100482910482"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          Confirm Account Number
                        </label>
                        <input
                          type="text"
                          value={confirmAccountNumber}
                          onChange={(e) => setConfirmAccountNumber(e.target.value)}
                          placeholder="Re-enter number"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-slate-500 dark:text-slate-400">
                          11-Digit IFSC Code
                        </label>
                        {isLookingUpIfsc && (
                          <span className="text-[10px] text-blue-500 flex items-center gap-1">
                            <RotateCw className="w-3 h-3 animate-spin" />
                            <span>Verifying branch...</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={11}
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0000060"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono uppercase text-slate-900 dark:text-white"
                      />
                      {bankLookupResult && (
                        <div className="mt-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-md text-[11px] text-emerald-800 dark:text-emerald-300">
                          ✓ {bankLookupResult.bankName} — {bankLookupResult.branchName}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStep('amount');
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToOtp}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Authorize & Send Security OTP</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 3: Security 2FA OTP Verification */}
        {step === 'otp' && (
          <div className="pt-5 space-y-5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Authorize ₹{amount.toLocaleString('en-IN')} Payout
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                A 6-digit confirmation code has been dispatched to your registered mobile number{' '}
                <span className="font-mono text-slate-800 dark:text-slate-200">{currentUser.phone}</span>
              </p>
            </div>

            {/* Simulated Live SMS Notification Banner for Effortless Testing */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Incoming Security SMS (Simulation)</span>
                </span>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Just now</span>
              </div>
              <p className="font-mono text-amber-900 dark:text-amber-200 text-xs">
                &quot;Do not share OTP: Use code <strong className="font-bold underline text-sm">{generatedOtp}</strong> to authorize Server 03 withdrawal of ₹{amount.toLocaleString('en-IN')}.&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setEnteredOtp(generatedOtp);
                  setOtpError('');
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors cursor-pointer"
              >
                1-Click Auto-Fill Code ({generatedOtp})
              </button>
            </div>

            {/* OTP input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center mb-2">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => {
                  setEnteredOtp(e.target.value.replace(/\D/g, ''));
                  setOtpError('');
                }}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.5em] text-2xl font-bold font-mono py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 text-center">
                {otpError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStep('destination');
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Confirm & Submit Withdrawal</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 4: Submission Confirmation & Live Tracker */}
        {step === 'success' && (
          <div className="pt-6 space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Withdrawal Request Submitted
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Your request of ₹{amount.toLocaleString('en-IN')} has been authorized and queued in the core treasury network.
              </p>
            </div>

            {/* Transaction Ref Pill */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{createdTxnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Channel Reference</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{createdTxnRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Net Payable Amount</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  ₹{feeDetails.netPayableAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Live Status</span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold uppercase text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Pending Gateway Review</span>
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                  if (onTransactionCreated && createdTxnId) {
                    onTransactionCreated(createdTxnId);
                  }
                }}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Track Status in Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
