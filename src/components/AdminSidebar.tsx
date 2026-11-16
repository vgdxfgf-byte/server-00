import React from 'react';
import { useFintech } from '../context/FintechContext';
import {
  LayoutDashboard,
  Clock,
  Wallet,
  Users,
  Settings,
  History,
  Shield,
  ArrowLeft,
  AlertOctagon,
  CheckCircle2,
  CalendarClock,
  Lock,
  KeyRound,
} from 'lucide-react';
import { sound } from '../utils/audio';

export type AdminSection = 'overview' | 'withdrawals' | 'upcoming' | 'balances' | 'users' | 'settings' | 'security' | 'logs';

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  onExitAdmin: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSelectSection,
  onExitAdmin,
}) => {
  const { withdrawals, upcomingWithdrawals, systemConfig, toggleWithdrawalsEnabled, users, securityConfig, lockApp } = useFintech();

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const approvedCount = withdrawals.filter((w) => w.status === 'approved').length;
  const activeUpcomingCount = upcomingWithdrawals.filter(
    (u) => u.status === 'upcoming' || u.status === 'ready'
  ).length;

  const navItems = [
    {
      id: 'overview' as AdminSection,
      label: 'Overview & Treasury',
      icon: LayoutDashboard,
    },
    {
      id: 'withdrawals' as AdminSection,
      label: 'Withdrawal Queue',
      icon: Clock,
      badge: pendingCount + approvedCount > 0 ? pendingCount + approvedCount : undefined,
    },
    {
      id: 'upcoming' as AdminSection,
      label: 'Upcoming Withdraw List',
      icon: CalendarClock,
      badge: activeUpcomingCount > 0 ? activeUpcomingCount : undefined,
    },
    {
      id: 'balances' as AdminSection,
      label: 'Balance Management',
      icon: Wallet,
      highlight: true,
    },
    {
      id: 'users' as AdminSection,
      label: 'User Directory',
      icon: Users,
      badge: users.length,
    },
    {
      id: 'settings' as AdminSection,
      label: 'Limits & Gateway Fees',
      icon: Settings,
    },
    {
      id: 'security' as AdminSection,
      label: 'Security & Password',
      icon: KeyRound,
    },
    {
      id: 'logs' as AdminSection,
      label: 'Audit & Compliance Logs',
      icon: History,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
      {/* Brand & Super Admin badge */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
            PF
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Super Admin</span>
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            </h2>
            <p className="text-[11px] text-slate-400">Master Control Console</p>
          </div>
        </div>

        {/* Emergency Killswitch Widget */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Payout Rails Status
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                systemConfig.withdrawalsEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {systemConfig.withdrawalsEnabled ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>

          <button
            onClick={() => {
              toggleWithdrawalsEnabled();
            }}
            className={`w-full mt-2 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              systemConfig.withdrawalsEnabled
                ? 'bg-slate-200 hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-700 dark:hover:bg-rose-950/80 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {systemConfig.withdrawalsEnabled ? (
              <>
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Pause Platform Payouts</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resume Payout Rails</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sound.playClick();
                onSelectSection(item.id);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white text-blue-600'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Return to User Interface & Lock Controls */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {securityConfig.enabled && (
          <button
            onClick={lockApp}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock App Screen</span>
          </button>
        )}
        <button
          onClick={() => {
            sound.playClick();
            onExitAdmin();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to User Dashboard</span>
        </button>
      </div>
    </aside>
  );
};
