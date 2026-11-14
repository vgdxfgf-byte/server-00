import React, { useState } from 'react';
import { usePrediction } from '../context/PredictionContext';
import { Trophy, Lock, AlertCircle, ArrowRight, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';

export const UserLogin: React.FC = () => {
  const { userLogin, users } = usePrediction();
  const [username, setUsername] = useState('rohit99');
  const [password, setPassword] = useState('pass123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = userLogin(username, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Login failed');
      }
    }, 250);
  };

  const handleSelectUser = (u: { username: string; pass: string }) => {
    setUsername(u.username);
    setPassword(u.pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Neon Glows */}
      <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="w-full max-w-md mb-6 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-400 text-xs font-semibold tracking-wide mb-2 shadow-xs">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>YES / NO Sports Predictions Arena</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          <span>ApexPred</span>
          <span className="text-blue-500">Sports</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
          Participate in high-stakes live sports predictions using simulated virtual coins. No real money required.
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div>
            <h2 className="font-bold text-white text-lg">Member Sign In</h2>
            <p className="text-xs text-slate-400">Enter your assigned username and password</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Warning / Error Box */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Informative notice on admin provisioning */}
        <div className="mb-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Notice: Public registration and Google sign-in are disabled. Every user account is provisioned directly by the Platform Administrator.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Assigned Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rohit99"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Secret Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-700 active:to-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Authenticating...' : 'Enter Prediction Arena'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Pickers */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Provisioned Demo Accounts</span>
            </span>
            <button
              onClick={() => setShowDemoCredentials(!showDemoCredentials)}
              className="text-[10px] text-blue-400 hover:underline cursor-pointer"
            >
              {showDemoCredentials ? 'Hide' : 'View Accounts'}
            </button>
          </div>

          {showDemoCredentials && (
            <div className="space-y-1.5 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              {users
                .filter((u) => u.status === 'active')
                .slice(0, 3)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser({ username: u.username, pass: u.passwordHash })}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-900 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 group-hover:text-blue-400">{u.displayName}</span>
                      <span className="text-[10px] font-mono text-slate-500 ml-1.5">(@{u.username})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                      {u.coinBalance.toLocaleString()} coins
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <footer className="mt-8 text-center text-[11px] text-slate-600 max-w-sm">
        ⚖️ Purely simulated sports entertainment. Virtual coins possess zero cash equivalence and cannot be exchanged for real currency.
      </footer>
    </div>
  );
};
