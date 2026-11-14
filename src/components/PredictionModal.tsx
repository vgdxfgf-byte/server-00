import React, { useState } from 'react';
import { usePrediction } from '../context/PredictionContext';
import { PredictionMarket, PredictionChoice } from '../types/prediction';
import { X, Trophy, Coins, TrendingUp, AlertCircle, ShieldCheck, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PredictionModalProps {
  market: PredictionMarket | null;
  initialChoice?: PredictionChoice;
  onClose: () => void;
}

export const PredictionModal: React.FC<PredictionModalProps> = ({
  market,
  initialChoice = 'YES',
  onClose,
}) => {
  const { currentUser, placePrediction } = usePrediction();
  const [choice, setChoice] = useState<PredictionChoice>(initialChoice);
  const [stakeStr, setStakeStr] = useState<string>('200');
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!market) return null;

  const stake = parseInt(stakeStr, 10) || 0;
  const currentOdds = choice === 'YES' ? market.yesOdds : market.noOdds;
  const potentialPayout = Math.round(stake * currentOdds);
  const potentialProfit = Math.max(0, potentialPayout - stake);
  const userBalance = currentUser?.coinBalance || 0;

  const handleQuickAdd = (amount: number) => {
    setStakeStr(amount.toString());
    setError('');
  };

  const handleMaxStake = () => {
    const maxAllowed = Math.min(userBalance, market.maxBet);
    setStakeStr(maxAllowed.toString());
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = placePrediction({
      marketId: market.id,
      choice,
      coins: stake,
    });

    if (!res.success) {
      setError(res.error || 'Failed to place prediction');
      return;
    }

    setIsSuccess(true);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-white relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="pr-4">
            <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {market.category} · {market.matchEvent}
            </span>
            <h3 className="font-bold text-base text-white mt-1.5 leading-snug">
              {market.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">Prediction Locked!</h4>
            <p className="text-sm text-slate-400">
              You staked <strong className="text-amber-400 font-mono">{stake} Coins</strong> on{' '}
              <strong className={choice === 'YES' ? 'text-emerald-400' : 'text-rose-400'}>{choice}</strong> at{' '}
              <span className="font-mono">{currentOdds.toFixed(2)}x</span>.
            </p>
            <div className="text-xs text-slate-500 font-mono">Good luck! Payouts settle automatically post-match.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-4 space-y-5">
            {/* Pick YES or NO */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Select Your Prediction
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChoice('YES')}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    choice === 'YES'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base font-black tracking-wider text-emerald-400">YES</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {market.yesOdds.toFixed(2)}x Odds
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChoice('NO')}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    choice === 'NO'
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-950/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base font-black tracking-wider text-rose-400">NO</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {market.noOdds.toFixed(2)}x Odds
                  </span>
                </button>
              </div>
            </div>

            {/* Stake Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Virtual Coins to Stake
                </label>
                <div className="text-xs text-slate-400 font-mono">
                  Wallet Balance:{' '}
                  <span className="font-bold text-amber-400">
                    {userBalance.toLocaleString()} Coins
                  </span>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400">
                  <Coins className="w-5 h-5" />
                </span>
                <input
                  type="number"
                  min={market.minBet}
                  max={market.maxBet}
                  value={stakeStr}
                  onChange={(e) => {
                    setStakeStr(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-12 pr-20 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xl font-bold font-mono text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={handleMaxStake}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  MAX
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {[100, 250, 500, 1000, 2500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Payout Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Selected Multiplier:</span>
                <span className="font-bold text-white">{currentOdds.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Net Profit:</span>
                <span className="font-bold text-emerald-400">+{potentialProfit.toLocaleString()} Coins</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-sm">
                <span className="font-bold text-white">Total Potential Return:</span>
                <span className="font-extrabold text-amber-400 text-base">
                  {potentialPayout.toLocaleString()} Coins
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={stake <= 0 || stake > userBalance}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Confirm & Lock Prediction ({stake.toLocaleString()} Coins)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
