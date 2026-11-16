import React from 'react';
import { useFintech } from '../context/FintechContext';
import { Sun, Moon, Shield, ArrowUpRight, Smartphone, Lock } from 'lucide-react';
import { NotificationsPopover } from './NotificationsPopover';
import { sound } from '../utils/audio';

interface NavbarProps {
  activeTab: 'dashboard' | 'withdraw' | 'beneficiaries' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'withdraw' | 'beneficiaries' | 'admin') => void;
  onOpenWithdrawModal: () => void;
  onOpenProfileModal: () => void;
  onOpenApkModal: () => void;
  onSelectTxnId?: (txnId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenWithdrawModal,
  onOpenProfileModal,
  onOpenApkModal,
  onSelectTxnId,
}) => {
  const { currentRole, isAdminAccount, switchRole, theme, toggleTheme, currentUser, withdrawals, securityConfig, lockApp } = useFintech();

  const pendingCount = withdrawals.filter((w) => w.status === 'pending' || w.status === 'approved').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            switchRole('user');
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2 group cursor-pointer focus:outline-none"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm group-hover:bg-blue-500 transition-colors">
            S3
          </span>
          <span>Server 03</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
            Payouts
          </span>
        </button>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => {
              if (currentRole === 'admin') switchRole('user');
              setActiveTab('dashboard');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              activeTab === 'dashboard' && currentRole === 'user'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              if (currentRole === 'admin') switchRole('user');
              setActiveTab('dashboard');
              onOpenWithdrawModal();
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              activeTab === 'withdraw'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Withdraw Funds
          </button>

          <button
            onClick={() => {
              if (currentRole === 'admin') switchRole('user');
              setActiveTab('beneficiaries');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              activeTab === 'beneficiaries'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Beneficiaries
          </button>

          {isAdminAccount && (
            <button
              onClick={() => {
                if (currentRole !== 'admin') {
                  switchRole('admin');
                }
                setActiveTab('admin');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                activeTab === 'admin' || currentRole === 'admin'
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Super Admin</span>
              {pendingCount > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action / controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notifications Popover */}
          <NotificationsPopover onSelectTxnId={onSelectTxnId} />

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Lock App button */}
          {securityConfig.enabled && (
            <button
              onClick={lockApp}
              aria-label="Lock application"
              title="Lock App (Require Username & Password)"
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Role switch toggle (Admins only) */}
          {isAdminAccount && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => {
                  switchRole('user');
                  setActiveTab('dashboard');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  currentRole === 'user'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                User
              </button>
              <button
                onClick={() => {
                  switchRole('admin');
                  setActiveTab('admin');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  currentRole === 'admin'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>
          )}

          {/* Android APK Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenApkModal();
            }}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            title="Install Android App / Download APK"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android APK</span>
          </button>

          {/* Quick Withdraw CTA */}
          <button
            onClick={onOpenWithdrawModal}
            className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Withdraw</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* User Profile Avatar Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenProfileModal();
            }}
            title="Profile & Account Settings"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 shrink-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
