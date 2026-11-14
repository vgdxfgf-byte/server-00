import React, { useState } from 'react';
import { usePrediction } from '../context/PredictionContext';
import { Shield, Lock, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { adminLogin, setActiveApp } = usePrediction();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = adminLogin(username, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Authentication failed');
      }
    }, 250);
  };

  const handleUseDemoAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Notice */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Shield className="w-3.5 h-3.5" />
          <span>Restricted Portal · Admin App</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          ApexPred <span className="text-rose-500">SuperAdmin</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Internal administrative console for sports predictions, user accounts, and virtual coin treasury.
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Admin Secure Gateway</h2>
              <p className="text-[11px] text-slate-400 font-mono">auth_level: super_admin</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
            v2.4 Core
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:from-rose-700 active:to-rose-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Admin Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Credentials Quickfill */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            Demo credentials: <code className="text-rose-400 bg-slate-950 px-1 py-0.5 rounded">admin</code> / <code className="text-rose-400 bg-slate-950 px-1 py-0.5 rounded">admin123</code>
          </div>
          <button
            type="button"
            onClick={handleUseDemoAdmin}
            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer"
          >
            Auto-fill
          </button>
        </div>
      </div>

      {/* Separate User App Link */}
      <div className="mt-8 text-center z-10">
        <p className="text-xs text-slate-500 mb-2">Players & Customers access their isolated portal separately:</p>
        <button
          onClick={() => setActiveApp('user')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Launch User Application (/?portal=user)</span>
        </button>
      </div>

      {/* Compliance Notice */}
      <footer className="mt-8 text-center text-[11px] text-slate-600 max-w-sm">
        Simulated virtual coin sports predictions platform. Zero real-money gaming, zero fiat cashouts.
      </footer>
    </div>
  );
};
