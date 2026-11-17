import React, { useState, useEffect, useMemo } from 'react';
import { useFintech } from '../context/FintechContext';
import { PaymentMethodType, UpcomingWithdrawal } from '../types';
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
  CalendarClock,
  Lock,
  MessageSquare,
} from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: (txnId: string) => void;
  preselectedUpcomingId?: string | null;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  preselectedUpcomingId,
}) => {
  const {
    currentUser,
    withdrawals,
    upcomingWithdrawals,
    requestWithdrawal,
    verifyOtpAndSubmit,
  } = useFintech();

  // Wizard steps: 'select' | 'destination' | 'otp' | 'success'
  const [step, setStep] = useState<'select' | 'destination' | 'otp' | 'success'>('select');

  // Selected Admin Withdrawal List Item
  const [selectedUpcomingId, setSelectedUpcomingId] = useState<string>('');

  // Payment Method & Beneficiary
  const [method, setMethod] = useState<PaymentMethodType>('upi');
  const [selectedUpiId, setSelectedUpiId] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [createdTxnId, setCreatedTxnId] = useState<string>('');
  const [createdTxnRef, setCreatedTxnRef] = useState<string>('');

  // General error state
  const [formError, setFormError] = useState<string>('');

  // Map active/completed withdrawals per upcomingWithdrawalId for current user
  const submittedByUpcomingId = useMemo(() => {
    const map = new Map<string, string>();
    withdrawals.forEach((w) => {
      if (
        w.userId === currentUser.id &&
        w.upcomingWithdrawalId &&
        w.status !== 'rejected' &&
        w.status !== 'failed'
      ) {
        map.set(w.upcomingWithdrawalId, w.id);
      }
    });
    return map;
  }, [withdrawals, currentUser.id]);

  // All Admin Withdrawal List items visible for this user that are upcoming or ready
  const visibleAdminItems = useMemo(() => {
    return upcomingWithdrawals.filter(
      (item) =>
        (item.targetUserId === 'ALL' || item.targetUserId === currentUser.id) &&
        (item.status === 'upcoming' || item.status === 'ready')
    );
  }, [upcomingWithdrawals, currentUser.id]);

  const unsubmittedItems = useMemo(() => {
    return visibleAdminItems.filter((item) => !submittedByUpcomingId.has(item.id));
  }, [visibleAdminItems, submittedByUpcomingId]);

  const selectedUpcoming: UpcomingWithdrawal | undefined = useMemo(() => {
    return unsubmittedItems.find((item) => item.id === selectedUpcomingId);
  }, [unsubmittedItems, selectedUpcomingId]);

  const pickDefaultUpi = () => {
    const def = currentUser.upiBeneficiaries.find((u) => u.isDefault);
    return def?.id || currentUser.upiBeneficiaries[0]?.id || '';
  };

  const pickDefaultBank = () => {
    const def = currentUser.bankBeneficiaries.find((b) => b.isDefault);
    return def?.id || currentUser.bankBeneficiaries[0]?.id || '';
  };

  // Sync defaults when modal opens or user/preselection changes
  useEffect(() => {
    if (!isOpen) return;
    setStep('select');
    setFormError('');
    setOtpError('');
    setEnteredOtp('');

    const preferred =
      preselectedUpcomingId && unsubmittedItems.some((i) => i.id === preselectedUpcomingId)
        ? preselectedUpcomingId
        : unsubmittedItems[0]?.id || '';

    setSelectedUpcomingId(preferred);
    setSelectedUpiId(pickDefaultUpi());
    setSelectedBankId(pickDefaultBank());
  }, [isOpen, currentUser.id, preselectedUpcomingId]);

  // Keep selected payment method aligned with selected Admin withdrawal item's allowed rail
  useEffect(() => {
    if (!selectedUpcoming) return;
    if (selectedUpcoming.paymentMethod === 'upi') {
      setMethod('upi');
    } else if (selectedUpcoming.paymentMethod === 'bank_transfer') {
      setMethod('bank_transfer');
    } else {
      // 'any': prefer method where user actually has an Admin-assigned beneficiary
      if (currentUser.upiBeneficiaries.length === 0 && currentUser.bankBeneficiaries.length > 0) {
        setMethod('bank_transfer');
      } else {
        setMethod('upi');
      }
    }
  }, [selectedUpcoming?.id, currentUser.upiBeneficiaries.length, currentUser.bankBeneficiaries.length]);

  if (!isOpen) return null;

  const amount = selectedUpcoming?.withdrawalAmount ?? 0;
  const withdrawalCharge = selectedUpcoming?.withdrawalCharge ?? 0;
  const netPayableAmount = selectedUpcoming?.netAmount ?? 0;

  // Step 1 Validation -> Proceed to Admin-Assigned Beneficiary Selection
  const handleProceedToDestination = () => {
    sound.playClick();
    setFormError('');

    if (!selectedUpcoming) {
      setFormError('Please select an authorized withdrawal from the Admin Withdrawal List.');
      sound.playWarning();
      return;
    }

    if (currentUser.isFrozen) {
      setFormError('Your account is currently restricted. Please contact Super Admin.');
      sound.playWarning();
      return;
    }

    if (amount > currentUser.availableBalance) {
      setFormError(
        `Insufficient available balance. Required ₹${amount.toLocaleString('en-IN')}, available ₹${currentUser.availableBalance.toLocaleString('en-IN')}.`
      );
      sound.playWarning();
      return;
    }

    const dailyRemaining = Math.max(0, currentUser.dailyWithdrawalLimit - currentUser.withdrawnToday);
    if (amount > dailyRemaining) {
      setFormError(
        `Daily ceiling reached. You can withdraw at most ₹${dailyRemaining.toLocaleString('en-IN')} today.`
      );
      sound.playWarning();
      return;
    }

    setStep('destination');
  };

  // Step 2 Validation -> Trigger OTP Generation & proceed to OTP
  const handleProceedToOtp = () => {
    sound.playClick();
    setFormError('');

    if (!selectedUpcoming) {
      setFormError('No withdrawal item selected.');
      sound.playWarning();
      return;
    }

    const beneficiaryId = method === 'upi' ? selectedUpiId : selectedBankId;
    if (!beneficiaryId) {
      setFormError(
        method === 'upi'
          ? 'No Admin-assigned UPI beneficiary account found on your profile.'
          : 'No Admin-assigned Bank beneficiary account found on your profile.'
      );
      sound.playWarning();
      return;
    }

    const res = requestWithdrawal({
      upcomingWithdrawalId: selectedUpcoming.id,
      paymentMethod: method,
      beneficiaryId,
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

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setStep('success');
  };

  const allowUpiMethod = !selectedUpcoming || selectedUpcoming.paymentMethod === 'any' || selectedUpcoming.paymentMethod === 'upi';
  const allowBankMethod = !selectedUpcoming || selectedUpcoming.paymentMethod === 'any' || selectedUpcoming.paymentMethod === 'bank_transfer';

  const hasAssignedForCurrentMethod =
    method === 'upi'
      ? currentUser.upiBeneficiaries.length > 0
      : currentUser.bankBeneficiaries.length > 0;

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
                {step === 'select' && 'Select Admin Withdrawal'}
                {step === 'destination' && 'Select Admin-Assigned Beneficiary'}
                {step === 'otp' && 'Two-Factor Security Verification'}
                {step === 'success' && 'Withdrawal Dispatched Successfully'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'select' && 'Only withdrawals published by Super Admin can be withdrawn'}
                {step === 'destination' && 'Choose from beneficiary accounts assigned by Super Admin'}
                {step === 'otp' && 'Authorize payout with encrypted 2FA OTP'}
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

        {/* Wizard Step 1: Select Admin Withdrawal List Item */}
        {step === 'select' && (
          <div className="pt-5 space-y-4">
            {/* Balance notice */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
              <span className="text-slate-600 dark:text-slate-300">Available Payout Balance:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                ₹{currentUser.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Admin-only rule notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                Withdrawals are strictly restricted to items authorized by Super Admin in your{' '}
                <strong>Withdrawal List</strong> with fixed payout amount and charge.
              </span>
            </div>

            {visibleAdminItems.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20 space-y-2">
                <CalendarClock className="w-7 h-7 mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  No Admin-authorized withdrawals available
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Please wait for Super Admin to publish an upcoming withdrawal item to your Withdrawal List.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {visibleAdminItems.map((item) => {
                  const submittedTxnId = submittedByUpcomingId.get(item.id);
                  const isSubmitted = Boolean(submittedTxnId);
                  const isSelected = !isSubmitted && selectedUpcomingId === item.id;

                  return (
                    <label
                      key={item.id}
                      className={`block p-3.5 rounded-xl border transition-colors ${
                        isSubmitted
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 opacity-70 cursor-not-allowed'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 cursor-pointer'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="radio"
                            name="upcomingWithdrawalSelection"
                            disabled={isSubmitted}
                            checked={isSelected}
                            onChange={() => {
                              sound.playClick();
                              setSelectedUpcomingId(item.id);
                              setFormError('');
                            }}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.scheduledDate} ·{' '}
                              {item.paymentMethod === 'bank_transfer'
                                ? 'Bank IMPS/NEFT'
                                : item.paymentMethod === 'upi'
                                ? 'UPI Instant'
                                : 'Bank or UPI'}
                            </div>
                          </div>
                        </div>

                        {isSubmitted ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                            Submitted ({submittedTxnId})
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                              item.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {item.status === 'ready' ? 'Ready' : 'Upcoming'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Amount</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ₹{item.withdrawalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Charge</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            -₹{item.withdrawalCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Net Payout</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{item.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {item.note && (
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                          <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="break-words">{item.note}</span>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Summary Breakdown of Selected Item */}
            {selectedUpcoming && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <div className="p-3 space-y-1.5 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Admin Withdrawal Amount</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Admin Withdrawal Charge</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      -₹{withdrawalCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                    <span className="text-slate-900 dark:text-white">Net Payable to Your Account</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 text-sm">
                      ₹{netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                disabled={!selectedUpcoming}
                onClick={handleProceedToDestination}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Admin-Assigned Beneficiary</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Admin-Assigned Beneficiary Selection */}
        {step === 'destination' && selectedUpcoming && (
          <div className="pt-5 space-y-5">
            {/* Selected Item Summary Strip */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <div className="font-bold text-slate-900 dark:text-white truncate">{selectedUpcoming.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Amount ₹{amount.toLocaleString('en-IN')} · Charge ₹{withdrawalCharge.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="text-[10px] text-slate-400 block">Net Payout</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  ₹{netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Method Segmented Selector (Respects Admin Rail Restriction) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                disabled={!allowUpiMethod}
                onClick={() => {
                  sound.playClick();
                  setMethod('upi');
                  setFormError('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                  !allowUpiMethod
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : method === 'upi'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs cursor-pointer'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Instant (VPA)</span>
              </button>

              <button
                type="button"
                disabled={!allowBankMethod}
                onClick={() => {
                  sound.playClick();
                  setMethod('bank_transfer');
                  setFormError('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                  !allowBankMethod
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : method === 'bank_transfer'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs cursor-pointer'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Bank IMPS Transfer</span>
              </button>
            </div>

            {/* UPI Beneficiaries (Admin-Assigned Only) */}
            {method === 'upi' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Admin-Assigned UPI Beneficiaries
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Admin Managed
                  </span>
                </div>

                {currentUser.upiBeneficiaries.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <p className="font-bold">No Admin-assigned UPI beneficiary found</p>
                    <p className="text-[11px]">
                      Only Super Admin can add beneficiary accounts to your profile. Contact Super Admin or switch to Bank Transfer if assigned.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentUser.upiBeneficiaries.map((upi) => (
                      <label
                        key={upi.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedUpiId === upi.id
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="upiSelection"
                            checked={selectedUpiId === upi.id}
                            onChange={() => {
                              setSelectedUpiId(upi.id);
                              setFormError('');
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
                )}
              </div>
            )}

            {/* Bank Beneficiaries (Admin-Assigned Only) */}
            {method === 'bank_transfer' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Admin-Assigned Bank Accounts
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Admin Managed
                  </span>
                </div>

                {currentUser.bankBeneficiaries.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <p className="font-bold">No Admin-assigned Bank beneficiary found</p>
                    <p className="text-[11px]">
                      Only Super Admin can add beneficiary accounts to your profile. Contact Super Admin or switch to UPI if assigned.
                    </p>
                  </div>
                ) : (
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
                            onChange={() => {
                              setSelectedBankId(b.id);
                              setFormError('');
                            }}
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
                        {b.isDefault && (
                          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </label>
                    ))}
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
                  setStep('select');
                  setFormError('');
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!hasAssignedForCurrentMethod}
                onClick={handleProceedToOtp}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Authorize &amp; Send Security OTP</span>
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
                <span>Confirm &amp; Submit Withdrawal</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 4: Submission Confirmation */}
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
                Your withdrawal of ₹{amount.toLocaleString('en-IN')} from the Admin Withdrawal List has been authorized and queued.
              </p>
            </div>

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
                <span className="text-slate-500 dark:text-slate-400">Gross Withdrawal Amount</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Withdrawal Charge</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">
                  -₹{withdrawalCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Net Payable Amount</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  ₹{netPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
