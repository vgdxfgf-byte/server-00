import React, { useState } from 'react';
import { usePrediction } from '../context/PredictionContext';
import {
  PlatformUser,
  SportCategory,
  PredictionMarket,
  UserPrediction,
  SimulatedWithdrawalRequest,
  PredictionChoice,
} from '../types/prediction';
import {
  ShieldAlert,
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  KeyRound,
  ExternalLink,
  Sliders,
  Bell,
  Trash2,
  Lock,
  Unlock,
  Radio,
  Flame,
  Activity,
  History,
  Check,
  Percent,
  Copy,
  Link,
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'markets' | 'resolutions' | 'withdrawals' | 'announcements' | 'security' | 'logs';

export const AdminDashboard: React.FC = () => {
  const {
    currentAdmin,
    adminLogout,
    adminChangePassword,
    setActiveApp,
    users,
    markets,
    userPredictions,
    transactions,
    withdrawalRequests,
    announcements,
    auditLogs,
    adminCreateUser,
    adminUpdateUserStatus,
    adminResetUserPassword,
    adminAdjustCoins,
    adminDeleteUser,
    adminCreateMarket,
    adminUpdateMarketOdds,
    adminUpdateMarketStatus,
    adminResolveMarket,
    adminDeleteMarket,
    adminApproveWithdrawal,
    adminRejectWithdrawal,
    adminCreateAnnouncement,
    adminDeleteAnnouncement,
    resetAllPlatformData,
  } = usePrediction();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Admin password change state
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordForm, setAdminPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [adminPasswordError, setAdminPasswordError] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // User management modals & states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    displayName: '',
    password: '',
    initialCoins: 0, // Starts at 0 virtual coins
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'blocked'>('all');

  const [selectedUserForCoins, setSelectedUserForCoins] = useState<PlatformUser | null>(null);
  const [coinAdjustForm, setCoinAdjustForm] = useState({
    type: 'admin_credit' as 'admin_credit' | 'admin_debit' | 'set_balance',
    amount: '',
    reason: '',
  });

  const [selectedUserForPassword, setSelectedUserForPassword] = useState<PlatformUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Market management states
  const [showCreateMarketModal, setShowCreateMarketModal] = useState(false);
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [marketSportFilter, setMarketSportFilter] = useState<string>('all');
  const [newMarketForm, setNewMarketForm] = useState({
    title: '',
    description: 'Outcome determined by official match broadcast stats.',
    category: 'Cricket' as SportCategory,
    matchEvent: 'India vs Australia • Match 24',
    eventDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    closingTime: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
    status: 'open' as const,
    yesOdds: '1.85',
    noOdds: '1.95',
    featured: false,
    minBet: 10,
    maxBet: 50000,
  });

  const [editingOddsMarket, setEditingOddsMarket] = useState<PredictionMarket | null>(null);
  const [oddsForm, setOddsForm] = useState({ yesOdds: '', noOdds: '' });

  // Resolution states
  const [selectedMarketToResolve, setSelectedMarketToResolve] = useState<PredictionMarket | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState<PredictionChoice>('YES');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Withdrawal rejection modal
  const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<string | null>(null);
  const [rejectionReasonNote, setRejectionReasonNote] = useState('');

  // Announcement state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
  });

  // Aggregations
  const totalCoinsInCirculation = users.reduce((sum: number, u: PlatformUser) => sum + u.coinBalance, 0);
  const activeMarketsCount = markets.filter((m: PredictionMarket) => m.status === 'open').length;
  const pendingWithdrawals = withdrawalRequests.filter((w: SimulatedWithdrawalRequest) => w.status === 'pending');
  const pendingPredictions = userPredictions.filter((p: UserPrediction) => p.status === 'pending');

  // Handle SuperAdmin password change
  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError('');
    if (adminPasswordForm.newPassword !== adminPasswordForm.confirmPassword) {
      setAdminPasswordError('New password and confirmation do not match.');
      return;
    }
    const res = adminChangePassword(adminPasswordForm.oldPassword, adminPasswordForm.newPassword);
    if (!res.success) {
      setAdminPasswordError(res.error || 'Failed to update admin password');
    } else {
      showToast('SuperAdmin master password updated successfully!');
      setShowAdminPasswordModal(false);
      setAdminPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  // Handle user creation
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.password.trim()) return;

    const res = adminCreateUser({
      username: newUserForm.username.trim(),
      displayName: newUserForm.displayName.trim() || newUserForm.username.trim(),
      password: newUserForm.password.trim(),
      initialCoins: Number(newUserForm.initialCoins) || 0,
    });

    if (res.success) {
      showToast(`User account @${newUserForm.username} created with ${newUserForm.initialCoins} VC!`);
      setShowCreateUserModal(false);
      setNewUserForm({ username: '', displayName: '', password: '', initialCoins: 0 });
    } else {
      alert(res.error || 'Failed to create user');
    }
  };

  // Handle coin adjustment submit
  const handleCoinAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForCoins) return;
    const amountNum = parseFloat(coinAdjustForm.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Please enter a valid coin amount.');
      return;
    }
    if (!coinAdjustForm.reason.trim()) {
      alert('Audit reason is required for any treasury change.');
      return;
    }

    const res = adminAdjustCoins({
      userId: selectedUserForCoins.id,
      type: coinAdjustForm.type,
      amount: amountNum,
      reason: coinAdjustForm.reason.trim(),
    });

    if (res.success) {
      showToast(`Adjusted coins for @${selectedUserForCoins.username}`);
      setSelectedUserForCoins(null);
      setCoinAdjustForm({ type: 'admin_credit', amount: '', reason: '' });
    } else {
      alert(res.error || 'Failed to adjust coins');
    }
  };

  // Handle password reset submit
  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordValue.trim()) return;
    const res = adminResetUserPassword(selectedUserForPassword.id, newPasswordValue.trim());
    if (res.success) {
      showToast(`Password reset successfully for @${selectedUserForPassword.username}`);
      setSelectedUserForPassword(null);
      setNewPasswordValue('');
    } else {
      alert(res.error || 'Failed to reset password');
    }
  };

  // Handle create market submit
  const handleCreateMarketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const yes = parseFloat(newMarketForm.yesOdds);
    const no = parseFloat(newMarketForm.noOdds);
    if (isNaN(yes) || yes <= 1.0 || isNaN(no) || no <= 1.0) {
      alert('Odds must be valid decimal multipliers greater than 1.0 (e.g., 1.85)');
      return;
    }

    const closingIso = new Date(newMarketForm.closingTime).toISOString();

    const res = adminCreateMarket({
      title: newMarketForm.title,
      description: newMarketForm.description,
      category: newMarketForm.category,
      matchEvent: newMarketForm.matchEvent,
      eventDate: closingIso,
      closingTime: closingIso,
      status: 'open',
      yesOdds: yes,
      noOdds: no,
      featured: newMarketForm.featured,
      minBet: newMarketForm.minBet,
      maxBet: newMarketForm.maxBet,
    });

    if (res.success) {
      showToast(`Created prediction market: "${newMarketForm.title}"`);
      setShowCreateMarketModal(false);
      setNewMarketForm({
        title: '',
        description: 'Outcome determined by official match broadcast stats.',
        category: 'Cricket',
        matchEvent: '',
        eventDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        closingTime: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
        status: 'open',
        yesOdds: '1.85',
        noOdds: '1.95',
        featured: false,
        minBet: 10,
        maxBet: 50000,
      });
    } else {
      alert(res.error || 'Failed to create market');
    }
  };

  // Handle market resolve
  const handleResolveMarketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarketToResolve) return;
    const res = adminResolveMarket(
      selectedMarketToResolve.id,
      resolutionChoice,
      resolutionNotes.trim() || 'Official match outcome certified'
    );
    if (res.success) {
      showToast(`Resolved market as ${resolutionChoice}. Winning payouts credited!`);
      setSelectedMarketToResolve(null);
      setResolutionNotes('');
    } else {
      alert(res.error || 'Failed to resolve market');
    }
  };

  // Handle rejection submit with reason note
  const handleRejectWithdrawalConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingWithdrawalId) return;
    const res = adminRejectWithdrawal(rejectingWithdrawalId, rejectionReasonNote.trim() || 'Admin rejected request');
    if (res.success) {
      showToast('Withdrawal rejected and virtual coins refunded to user.');
      setRejectingWithdrawalId(null);
      setRejectionReasonNote('');
    } else {
      alert(res.error || 'Failed to reject request');
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u: PlatformUser) => {
    const matchesSearch =
      u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered markets
  const filteredMarkets = markets.filter((m: PredictionMarket) => {
    const matchesSearch =
      m.title.toLowerCase().includes(marketSearchTerm.toLowerCase()) ||
      m.matchEvent.toLowerCase().includes(marketSearchTerm.toLowerCase());
    const matchesSport = marketSportFilter === 'all' || m.category === marketSportFilter;
    return matchesSearch && matchesSport;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-300 bg-clip-text text-transparent">
                  APEX COMMAND
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  SUPER ADMIN PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400">Sports Prediction Engine • Server 03</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Link to User App */}
            <button
              onClick={() => setActiveApp('user')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
              title="Open User Prediction Application"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Launch User App</span>
            </button>

            {/* Quick DB Seed Reset */}
            <button
              onClick={() => {
                if (window.confirm('Reset platform data to clean seed state? This restores default users and markets.')) {
                  resetAllPlatformData();
                  showToast('Database reset to fresh factory state.');
                }
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
              title="Reset Demo Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Admin identity badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-xs">
                AD
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{currentAdmin?.username || 'SuperAdmin'}</div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider">Root Authority</div>
              </div>

              {/* Admin Change Password Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAdminPasswordModal(true);
                  setAdminPasswordError('');
                  setAdminPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="ml-2 px-2.5 py-1 text-xs rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Change SuperAdmin Security Password"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Change Password</span>
              </button>

              <button
                onClick={adminLogout}
                className="ml-1 px-2.5 py-1 text-xs rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition font-medium cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-800/60 py-1.5 scrollbar-none">
          {[
            { id: 'overview', label: 'Control Overview', icon: Activity },
            { id: 'users', label: `User Directory (${users.length})`, icon: Users },
            { id: 'markets', label: `Markets & Odds (${markets.length})`, icon: Trophy },
            { id: 'resolutions', label: 'Match Resolutions', icon: CheckCircle2 },
            {
              id: 'withdrawals',
              label: `Simulated Cashouts (${pendingWithdrawals.length})`,
              icon: DollarSign,
              badge: pendingWithdrawals.length,
            },
            { id: 'announcements', label: `Announcements (${announcements.length})`, icon: Bell },
            { id: 'security', label: 'Admin Security', icon: KeyRound },
            { id: 'logs', label: 'Audit Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Managed Users</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white">{users.length}</div>
                <p className="text-xs text-slate-400 mt-1">
                  Active: <span className="text-emerald-400 font-semibold">{users.filter((u: PlatformUser) => u.status === 'active').length}</span> • Suspended: {users.filter((u: PlatformUser) => u.status === 'suspended').length}
                </p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Virtual Coins Circulation</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300">
                  {totalCoinsInCirculation.toLocaleString()} <span className="text-xs text-amber-500">VC</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Zero real money • Platform simulated</p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Active Markets</span>
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">{activeMarketsCount} / {markets.length}</div>
                <p className="text-xs text-slate-400 mt-1">
                  Unsettled predictions: <span className="text-cyan-400 font-semibold">{pendingPredictions.length}</span>
                </p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Simulated Cashout Queue</span>
                  <Clock className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-300">{pendingWithdrawals.length}</div>
                <p className="text-xs text-slate-400 mt-1">
                  Volume: {pendingWithdrawals.reduce((s: number, w: SimulatedWithdrawalRequest) => s + w.coinAmount, 0).toLocaleString()} VC
                </p>
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base">Platform Quick Actions</h3>
                <p className="text-xs text-slate-400">Add users, provision odds, resolve ongoing matches</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setShowCreateUserModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create User Account</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('markets');
                    setShowCreateMarketModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Prediction Market</span>
                </button>

                <button
                  onClick={() => setActiveTab('resolutions')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Resolve Match Odds</span>
                </button>
              </div>
            </div>

            {/* Dedicated Portal Links Display */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Autonomous Application URLs</h3>
                <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Isolated Portals
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                The User Application contains zero admin controls, badges, or portal links. Share the dedicated user URL with your players.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User App Link Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>User Prediction App (Client Website)</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                        Admin UI Hidden
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-all select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/?portal=user` : '/?portal=user'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/?portal=user`;
                        navigator.clipboard.writeText(url);
                        showToast('Copied User Portal Link to clipboard!');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy User Link</span>
                    </button>
                    <button
                      onClick={() => setActiveApp('user')}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View User App</span>
                    </button>
                  </div>
                </div>

                {/* Admin App Link Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Admin Console Portal (SuperAdmin Website)</span>
                      </span>
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-semibold">
                        Restricted
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-all select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/?portal=admin` : '/?portal=admin'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/?portal=admin`;
                        navigator.clipboard.writeText(url);
                        showToast('Copied Admin Portal Link to clipboard!');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Admin Link</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Two-column layout: Recent audit logs + Pending withdrawals preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Audit Trail */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Recent Audit Activities</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2.5">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-slate-200">{log.details}</div>
                      {log.targetId && (
                        <div className="text-[10px] text-cyan-400 mt-1">Target ID: {log.targetId}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Cashouts Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-rose-400" />
                    <h3 className="font-bold text-white text-sm">Pending Simulated Cashouts</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="text-xs text-rose-400 hover:underline font-semibold"
                  >
                    Manage ({pendingWithdrawals.length})
                  </button>
                </div>

                {pendingWithdrawals.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No pending cashout requests at this time.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingWithdrawals.slice(0, 4).map((req: SimulatedWithdrawalRequest) => (
                      <div key={req.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">@{req.username}</div>
                          <div className="text-xs text-slate-400">
                            <span className="text-amber-400 font-bold">{req.coinAmount.toLocaleString()} VC</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{req.destinationDetails}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              adminApproveWithdrawal(req.id);
                              showToast(`Approved payout for @${req.username}`);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50 text-xs font-bold border border-emerald-500/40"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingWithdrawalId(req.id);
                              setRejectionReasonNote('');
                            }}
                            className="px-2.5 py-1 rounded bg-rose-600/30 text-rose-400 hover:bg-rose-600/50 text-xs font-bold border border-rose-500/40"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search by username or ID..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
                  />
                </div>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="blocked">Blocked Only</option>
                </select>
              </div>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New User (Starts 0 VC)</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Coin Balance</th>
                      <th className="py-3 px-4">Credentials (Password)</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user: PlatformUser) => {
                        return (
                          <tr key={user.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white text-sm">{user.displayName}</div>
                              <div className="text-slate-400 font-mono text-[11px]">@{user.username}</div>
                              <div className="text-[10px] text-slate-600">ID: {user.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                                  user.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : user.status === 'suspended'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                              {user.coinBalance.toLocaleString()} VC
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded inline-block border border-slate-800">
                                  Pass: {user.passwordHash}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const text = `User Portal: ${window.location.origin}/?portal=user\nUsername: ${user.username}\nPassword: ${user.passwordHash}`;
                                    navigator.clipboard.writeText(text);
                                    showToast(`Copied login credentials & link for @${user.username}!`);
                                  }}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition"
                                  title="Copy Login Credentials & User Link"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Coin adjustments */}
                                <button
                                  onClick={() => {
                                    setSelectedUserForCoins(user);
                                    setCoinAdjustForm({ type: 'admin_credit', amount: '', reason: '' });
                                  }}
                                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-[11px] border border-amber-500/30"
                                  title="Adjust virtual coins"
                                >
                                  ± Coins
                                </button>

                                {/* Reset password */}
                                <button
                                  onClick={() => {
                                    setSelectedUserForPassword(user);
                                    setNewPasswordValue('');
                                  }}
                                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-[11px] border border-slate-700"
                                  title="Change password"
                                >
                                  Reset Pass
                                </button>

                                {/* Status toggles */}
                                {user.status === 'active' ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        adminUpdateUserStatus(user.id, 'suspended', 'Admin suspended user access');
                                        showToast(`Suspended @${user.username}`);
                                      }}
                                      className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[11px]"
                                    >
                                      Suspend
                                    </button>
                                    <button
                                      onClick={() => {
                                        adminUpdateUserStatus(user.id, 'blocked', 'Admin blocked user access');
                                        showToast(`Blocked @${user.username}`);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px]"
                                    >
                                      Block
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      adminUpdateUserStatus(user.id, 'active', 'Admin reinstated active status');
                                      showToast(`Re-activated @${user.username}`);
                                    }}
                                    className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] border border-emerald-500/30"
                                  >
                                    Activate
                                  </button>
                                )}

                                {/* Delete user */}
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Permanently delete @${user.username}?`)) {
                                      adminDeleteUser(user.id);
                                      showToast(`Deleted user @${user.username}`);
                                    }
                                  }}
                                  className="p-1 rounded bg-slate-800 hover:bg-rose-600/30 text-slate-500 hover:text-rose-400 transition"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MARKETS & ODDS */}
        {/* ========================================================= */}
        {activeTab === 'markets' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={marketSearchTerm}
                    onChange={(e) => setMarketSearchTerm(e.target.value)}
                    placeholder="Search markets or events..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-56"
                  />
                </div>

                <select
                  value={marketSportFilter}
                  onChange={(e) => setMarketSportFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Sports</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Formula 1">Formula 1</option>
                  <option value="MMA / Boxing">MMA / Boxing</option>
                </select>
              </div>

              <button
                onClick={() => setShowCreateMarketModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Market</span>
              </button>
            </div>

            {/* Markets List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMarkets.map((market: PredictionMarket) => {
                const isSettled = market.status === 'settled';
                const isCancelled = market.status === 'cancelled';
                const isOpen = market.status === 'open';

                return (
                  <div
                    key={market.id}
                    className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition ${
                      market.featured ? 'border-amber-500/40 bg-gradient-to-br from-slate-900 to-amber-950/20' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 uppercase tracking-wider">
                            {market.category}
                          </span>
                          <span className="text-xs text-slate-400">{market.matchEvent}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isOpen
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isSettled
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : isCancelled
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {market.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-base mb-1">{market.title}</h4>
                      <div className="text-xs text-slate-400 mb-3">{market.description}</div>

                      {/* Odds preview and quick update button */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/20">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">YES Multiplier</div>
                          <div className="text-lg font-black text-emerald-400">{market.yesOdds.toFixed(2)}x</div>
                          <div className="text-[10px] text-slate-500">Pool: {market.totalYesCoins.toLocaleString()} VC</div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/20">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">NO Multiplier</div>
                          <div className="text-lg font-black text-rose-400">{market.noOdds.toFixed(2)}x</div>
                          <div className="text-[10px] text-slate-500">Pool: {market.totalNoCoins.toLocaleString()} VC</div>
                        </div>
                      </div>

                      {/* Result indicator if settled */}
                      {market.resolvedOutcome && (
                        <div className="mb-3 p-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs flex items-center justify-between">
                          <span className="text-purple-300 font-semibold">Resolved Outcome:</span>
                          <span className="font-black text-white px-2 py-0.5 rounded bg-purple-600">
                            {market.resolvedOutcome}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Admin Action Controls */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingOddsMarket(market);
                            setOddsForm({ yesOdds: market.yesOdds.toString(), noOdds: market.noOdds.toString() });
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold flex items-center gap-1 border border-slate-700"
                        >
                          <Sliders className="w-3 h-3 text-amber-400" />
                          <span>Edit Odds</span>
                        </button>

                        {isOpen ? (
                          <button
                            onClick={() => {
                              adminUpdateMarketStatus(market.id, 'closed');
                              showToast(`Closed market #${market.id}`);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-amber-400 font-semibold"
                          >
                            Close
                          </button>
                        ) : market.status === 'closed' ? (
                          <button
                            onClick={() => {
                              adminUpdateMarketStatus(market.id, 'open');
                              showToast(`Reopened market #${market.id}`);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-semibold"
                          >
                            Re-open
                          </button>
                        ) : null}

                        {!isSettled && !isCancelled && (
                          <button
                            onClick={() => {
                              if (window.confirm('Cancel market and refund all user staked coins?')) {
                                adminUpdateMarketStatus(market.id, 'cancelled');
                                showToast('Market cancelled. All stakes refunded.');
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold"
                          >
                            Cancel & Refund
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isSettled && (
                          <button
                            onClick={() => {
                              setSelectedMarketToResolve(market);
                              setResolutionChoice('YES');
                              setResolutionNotes('');
                            }}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                          >
                            Resolve Outcome
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm('Permanently delete this market?')) {
                              adminDeleteMarket(market.id);
                              showToast('Market deleted.');
                            }
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-600/30 text-slate-500 hover:text-rose-400 transition"
                          title="Delete Market"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: RESOLUTIONS */}
        {/* ========================================================= */}
        {activeTab === 'resolutions' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Match Outcome Resolution Center</h3>
                  <p className="text-xs text-slate-400">
                    Settling a market automatically credits all winning users with their calculated potential payout!
                  </p>
                </div>
              </div>
            </div>

            {/* Unsettled markets waiting for outcome */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 text-sm">Unsettled Prediction Markets</h4>
              {markets.filter((m: PredictionMarket) => m.status === 'open' || m.status === 'closed').length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  All prediction markets are currently settled or cancelled!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {markets
                    .filter((m: PredictionMarket) => m.status === 'open' || m.status === 'closed')
                    .map((m: PredictionMarket) => {
                      const totalBets = userPredictions.filter((p: UserPrediction) => p.marketId === m.id).length;
                      return (
                        <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                              <span className="font-bold text-cyan-400">{m.category}</span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold uppercase">{m.status}</span>
                            </div>
                            <h4 className="font-bold text-white text-base mb-1">{m.title}</h4>
                            <p className="text-xs text-slate-400 mb-3">{m.matchEvent}</p>
                            <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between mb-4">
                              <span>Total User Slips: <strong>{totalBets}</strong></span>
                              <span>Total VC Staked: <strong>{(m.totalYesCoins + m.totalNoCoins).toLocaleString()} VC</strong></span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedMarketToResolve(m);
                              setResolutionChoice('YES');
                              setResolutionNotes('');
                            }}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Select & Declare Outcome</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SIMULATED CASHOUTS / WITHDRAWALS */}
        {/* ========================================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Simulated Cashout Requests</h3>
                <p className="text-xs text-slate-400">
                  Virtual coin liquidation simulator. Rejection refunds coins back to user balance with an audit note.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                {pendingWithdrawals.length} Pending Actions
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Request ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Virtual Coins</th>
                      <th className="py-3 px-4">Destination Vault</th>
                      <th className="py-3 px-4">Requested At</th>
                      <th className="py-3 px-4">Status & Notes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {withdrawalRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No withdrawal records on file.
                        </td>
                      </tr>
                    ) : (
                      withdrawalRequests.map((req: SimulatedWithdrawalRequest) => (
                        <tr key={req.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{req.id}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white">@{req.username}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                            {req.coinAmount.toLocaleString()} VC
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">{req.destinationDetails}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(req.requestedAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                                req.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {req.status}
                            </span>
                            {req.rejectionReason && (
                              <div className="text-[10px] text-rose-300 mt-1 italic">
                                Note: {req.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    adminApproveWithdrawal(req.id);
                                    showToast(`Approved simulated cashout for @${req.username}`);
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingWithdrawalId(req.id);
                                    setRejectionReasonNote('');
                                  }}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                                >
                                  Reject...
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: ANNOUNCEMENTS */}
        {/* ========================================================= */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-white text-base mb-1">Broadcast Announcement</h3>
              <p className="text-xs text-slate-400 mb-4">Post notices visible immediately in User Dashboards</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
                  adminCreateAnnouncement(
                    announcementForm.title.trim(),
                    announcementForm.content.trim(),
                    announcementForm.priority
                  );
                  showToast('Announcement broadcasted.');
                  setAnnouncementForm({ title: '', content: '', priority: 'normal' });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    placeholder="e.g. World Cup Finals Boost"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Priority</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Message Content</label>
                  <textarea
                    required
                    rows={4}
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                    placeholder="Type broadcast text for all active users..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
                >
                  Publish Broadcast
                </button>
              </form>
            </div>

            {/* Active announcements list */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-bold text-white text-base">Active Broadcasts ({announcements.length})</h3>
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          a.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : a.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {a.priority}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{a.title}</h4>
                    <p className="text-xs text-slate-300 mt-1">{a.content}</p>
                  </div>
                  <button
                    onClick={() => {
                      adminDeleteAnnouncement(a.id);
                      showToast('Announcement removed.');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: AUDIT LOGS */}
        {/* ========================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Immutable Audit Trail</h3>
                <p className="text-xs text-slate-400">
                  Every coin adjustment, password reset, market settlement, and withdrawal rejection is recorded.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{auditLogs.length} Events</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Admin Performer</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target ID</th>
                      <th className="py-3 px-4">Event Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-amber-400 font-semibold">{log.adminName}</td>
                        <td className="py-3 px-4 text-cyan-300 font-bold uppercase text-[10px]">{log.action}</td>
                        <td className="py-3 px-4 text-slate-300">{log.targetId || '—'}</td>
                        <td className="py-3 px-4 text-slate-200 font-sans text-xs">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: ADMIN SECURITY & PASSWORD */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">SuperAdmin Account Security</h3>
                  <p className="text-xs text-slate-400">Manage master authentication credentials and root session</p>
                </div>
              </div>

              {/* Admin Profile Overview */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Username</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">@{currentAdmin?.username || 'admin'}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Access Level</div>
                  <div className="text-sm font-bold text-amber-400 uppercase mt-0.5">Root SuperAdmin</div>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-1">Update Master Password</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Changes take effect immediately across all administrative sessions.
                </p>

                {adminPasswordError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{adminPasswordError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Current Master Password</label>
                    <input
                      type="password"
                      required
                      value={adminPasswordForm.oldPassword}
                      onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, oldPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">New Master Password</label>
                    <input
                      type="password"
                      required
                      value={adminPasswordForm.newPassword}
                      onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, newPassword: e.target.value })}
                      placeholder="Minimum 4 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={adminPasswordForm.confirmPassword}
                      onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Save & Update Root Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: CREATE USER */}
      {/* ========================================================= */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-1">Create User Account</h3>
            <p className="text-xs text-slate-400 mb-4">
              Manually provision login credentials. By default, newly created accounts start with <strong>0 virtual coins</strong>.
            </p>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g. krunal_expert"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={newUserForm.displayName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                  placeholder="e.g. Krunal Pandya"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Assign user password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Starting Virtual Coins <span className="text-slate-500">(Default: 0 VC)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newUserForm.initialCoins}
                  onChange={(e) => setNewUserForm({ ...newUserForm, initialCoins: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20"
                >
                  Create & Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: COIN ADJUSTMENT */}
      {/* ========================================================= */}
      {selectedUserForCoins && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Manage Virtual Coins</h3>
            <p className="text-xs text-slate-400 mb-4">
              User: <span className="text-cyan-400 font-bold">@{selectedUserForCoins.username}</span> • Current: {selectedUserForCoins.coinBalance.toLocaleString()} VC
            </p>

            <form onSubmit={handleCoinAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['admin_credit', 'admin_debit', 'set_balance'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCoinAdjustForm({ ...coinAdjustForm, type: t })}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                      coinAdjustForm.type === t
                        ? t === 'admin_credit'
                          ? 'bg-emerald-600 text-white'
                          : t === 'admin_debit'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'admin_credit' ? '+ Credit' : t === 'admin_debit' ? '- Debit' : '= Set Total'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Coin Amount</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={coinAdjustForm.amount}
                  onChange={(e) => setCoinAdjustForm({ ...coinAdjustForm, amount: e.target.value })}
                  placeholder="e.g. 1000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Audit Reason Note <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={coinAdjustForm.reason}
                  onChange={(e) => setCoinAdjustForm({ ...coinAdjustForm, reason: e.target.value })}
                  placeholder="e.g. Welcome bonus grant / Manual correction"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForCoins(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Apply Coin Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESET PASSWORD */}
      {/* ========================================================= */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-black text-white mb-1">Reset User Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Assign new login password for <span className="text-cyan-400 font-bold">@{selectedUserForPassword.username}</span>
            </p>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE PREDICTION MARKET */}
      {/* ========================================================= */}
      {showCreateMarketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white mb-1">Create Prediction Market</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure sports question, event details, closing timestamp, and decimal odds multipliers.
            </p>

            <form onSubmit={handleCreateMarketSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Prediction Title (YES / NO Question)</label>
                <input
                  type="text"
                  required
                  value={newMarketForm.title}
                  onChange={(e) => setNewMarketForm({ ...newMarketForm, title: e.target.value })}
                  placeholder="e.g. Will India score 180+ runs in first 20 overs?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Sport Category</label>
                  <select
                    value={newMarketForm.category}
                    onChange={(e) => setNewMarketForm({ ...newMarketForm, category: e.target.value as SportCategory })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Formula 1">Formula 1</option>
                    <option value="MMA / Boxing">MMA / Boxing</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Match / Event Title</label>
                  <input
                    type="text"
                    required
                    value={newMarketForm.matchEvent}
                    onChange={(e) => setNewMarketForm({ ...newMarketForm, matchEvent: e.target.value })}
                    placeholder="e.g. India vs Australia • Final"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Closes At (Time)</label>
                  <input
                    type="datetime-local"
                    required
                    value={newMarketForm.closingTime}
                    onChange={(e) => setNewMarketForm({ ...newMarketForm, closingTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">YES Odds (x)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={newMarketForm.yesOdds}
                    onChange={(e) => setNewMarketForm({ ...newMarketForm, yesOdds: e.target.value })}
                    placeholder="1.85"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">NO Odds (x)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={newMarketForm.noOdds}
                    onChange={(e) => setNewMarketForm({ ...newMarketForm, noOdds: e.target.value })}
                    placeholder="1.95"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description / Settlement Rules</label>
                <input
                  type="text"
                  value={newMarketForm.description}
                  onChange={(e) => setNewMarketForm({ ...newMarketForm, description: e.target.value })}
                  placeholder="Official referee report / broadcast stats"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={newMarketForm.featured}
                  onChange={(e) => setNewMarketForm({ ...newMarketForm, featured: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="featuredCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Feature on Top of User Dashboard
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateMarketModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Publish Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT ODDS */}
      {/* ========================================================= */}
      {editingOddsMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-black text-white mb-1">Update Live Odds</h3>
            <p className="text-xs text-slate-400 mb-4 line-clamp-1">{editingOddsMarket.title}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const yes = parseFloat(oddsForm.yesOdds);
                const no = parseFloat(oddsForm.noOdds);
                if (isNaN(yes) || isNaN(no) || yes <= 1.0 || no <= 1.0) {
                  alert('Odds must be valid numbers > 1.0');
                  return;
                }
                const res = adminUpdateMarketOdds(editingOddsMarket.id, yes, no);
                if (res.success) {
                  showToast('Updated live market odds.');
                  setEditingOddsMarket(null);
                } else {
                  alert(res.error || 'Failed to update odds');
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-1">YES Odds</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={oddsForm.yesOdds}
                    onChange={(e) => setOddsForm({ ...oddsForm, yesOdds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-rose-400 block mb-1">NO Odds</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={oddsForm.noOdds}
                    onChange={(e) => setOddsForm({ ...oddsForm, noOdds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOddsMarket(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Update Odds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESOLVE MARKET OUTCOME */}
      {/* ========================================================= */}
      {selectedMarketToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Declare Match Outcome</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedMarketToResolve.title}</p>

            <form onSubmit={handleResolveMarketSubmit} className="space-y-4">
              <label className="text-xs font-semibold text-slate-300 block">Select Winning Result</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setResolutionChoice('YES')}
                  className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition ${
                    resolutionChoice === 'YES'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>YES WON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionChoice('NO')}
                  className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition ${
                    resolutionChoice === 'NO'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>NO WON</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Verification / Official Match Note</label>
                <input
                  type="text"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Official score 186/4, India won by 6 wickets"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Warning: Resolving as <strong>{resolutionChoice}</strong> immediately distributes all winning coin payouts to users who backed {resolutionChoice}.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMarketToResolve(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
                >
                  Confirm & Distribute Coins
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REJECT WITHDRAWAL WITH REASON NOTE */}
      {/* ========================================================= */}
      {rejectingWithdrawalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-black text-white mb-1">Reject Simulated Cashout</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter a mandatory reason note for the user. Virtual coins will be immediately refunded to their balance.
            </p>

            <form onSubmit={handleRejectWithdrawalConfirm} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Cancellation / Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReasonNote}
                  onChange={(e) => setRejectionReasonNote(e.target.value)}
                  placeholder="e.g. Account verification required / Invalid simulated vault details / Maximum daily quota reached"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingWithdrawalId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20"
                >
                  Reject & Refund Coins
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADMIN CHANGE PASSWORD */}
      {/* ========================================================= */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Change Master Password</h3>
                <p className="text-xs text-slate-400">SuperAdmin Root Account (@{currentAdmin?.username || 'admin'})</p>
              </div>
            </div>

            {adminPasswordError && (
              <div className="my-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{adminPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={adminPasswordForm.oldPassword}
                  onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, oldPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={adminPasswordForm.newPassword}
                  onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, newPassword: e.target.value })}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={adminPasswordForm.confirmPassword}
                  onChange={(e) => setAdminPasswordForm({ ...adminPasswordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
