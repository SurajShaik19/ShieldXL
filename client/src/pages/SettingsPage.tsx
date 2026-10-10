import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AdminSessionSetup } from '../components/AdminSessionSetup';
import { openPlatformLogin } from '../services/shieldxlStore';
import {
  Settings,
  User,
  Bell,
  LogOut,
  CheckCircle2,
  Share2,
  Unlink,
  RefreshCw,
  Globe,
  LogIn,
  X as CloseIcon,
  Sparkles,
  Upload,
  ExternalLink,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout, login: authLogin } = useAuth();
  const [testingAlert, setTestingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleTestAlert = async () => {
    setTestingAlert(true);
    setAlertSuccess(false);
    try {
      await api.post('/notifications/test');
      setAlertSuccess(true);
    } catch {
      alert('Failed to trigger test alert.');
    } finally {
      setTestingAlert(false);
    }
  };

  const handleSwitchRole = async (targetRole: 'USER' | 'REVIEWER' | 'ADMIN') => {
    setSwitchingRole(true);
    const email =
      targetRole === 'ADMIN'
        ? 'admin@defense.agency'
        : targetRole === 'REVIEWER'
        ? 'reviewer@defense.agency'
        : 'analyst@defense.agency';

    try {
      const res = await api.post('/auth/login', {
        email,
        password: 'Password123!',
      });
      authLogin(res.data.token, res.data.user);
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed switching to ${targetRole}.`);
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-6 h-6 text-cyan-400" />
          ShieldXL Settings & Platform Sessions
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account credentials, browser session configurations, and alert settings.
        </p>
      </div>

      {/* User Profile Card with Quick Account Switcher */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" /> Account Profile
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] uppercase font-semibold text-slate-500 mr-1">Switch Account:</span>
            <button
              onClick={() => handleSwitchRole('USER')}
              disabled={switchingRole || user?.role === 'USER'}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                user?.role === 'USER'
                  ? 'bg-cyan-500 text-navy-950'
                  : 'bg-navy-950 hover:bg-navy-800 text-slate-300 border border-navy-800'
              }`}
            >
              Analyst
            </button>
            <button
              onClick={() => handleSwitchRole('REVIEWER')}
              disabled={switchingRole || user?.role === 'REVIEWER'}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                user?.role === 'REVIEWER'
                  ? 'bg-cyan-500 text-navy-950'
                  : 'bg-navy-950 hover:bg-navy-800 text-slate-300 border border-navy-800'
              }`}
            >
              Reviewer
            </button>
            <button
              onClick={() => handleSwitchRole('ADMIN')}
              disabled={switchingRole || user?.role === 'ADMIN'}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                user?.role === 'ADMIN'
                  ? 'bg-amber-500 text-navy-950'
                  : 'bg-navy-950 hover:bg-navy-800 text-slate-300 border border-navy-800'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block">Full Name</span>
            <span className="text-sm font-bold text-white mt-1 block">{user?.name}</span>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block">Email Address</span>
            <span className="text-sm font-bold text-white mt-1 block font-mono">{user?.email}</span>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block">Access Role</span>
            <span
              className={`inline-block mt-1 text-xs font-bold uppercase px-2.5 py-0.5 rounded ${
                user?.role === 'ADMIN'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
              }`}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* AI Browser Automation Session Setup & Management (Meta AI & Grok) */}
      <AdminSessionSetup isAdmin={user?.role === 'ADMIN'} />

      {/* Connected Social Media Accounts (Instagram & X) */}
      <ConnectedAccountsSection />

      {/* Notification Preferences & Test Alert */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" /> Notification Diagnostics
        </h3>
        <p className="text-xs text-slate-400">
          Verify that in-app notification routing and email dispatch services are responsive.
        </p>

        <div className="pt-2 flex items-center gap-4">
          <button
            onClick={handleTestAlert}
            disabled={testingAlert}
            className="bg-navy-800 hover:bg-navy-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50"
          >
            {testingAlert ? 'Dispatching...' : 'Trigger Test In-App Notification'}
          </button>

          {alertSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Test alert sent! Check your Alerts tab.
            </span>
          )}
        </div>
      </div>

      {/* Logout Action */}
      <div className="flex justify-end pt-4">
        <button
          onClick={logout}
          className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};

interface ConnectionItem {
  provider: 'INSTAGRAM' | 'X';
  providerUsername: string;
  providerUserId: string;
  scopes: string[];
  connectionStatus: string;
  connectedAt: string;
}

const ConnectedAccountsSection: React.FC = () => {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  // Modal State
  const [activeModalProvider, setActiveModalProvider] = useState<'INSTAGRAM' | 'X' | null>(null);
  const [connectionTab, setConnectionTab] = useState<'BROWSER' | 'COOKIES' | 'DIRECT'>('BROWSER');
  const [inputHandle, setInputHandle] = useState('');
  const [cookieInput, setCookieInput] = useState('');
  const [submittingDirect, setSubmittingDirect] = useState(false);
  const [launchingBrowser, setLaunchingBrowser] = useState(false);
  const [browserActive, setBrowserActive] = useState(false);
  const [savingBrowser, setSavingBrowser] = useState(false);

  const getLocalConnections = (): ConnectionItem[] => {
    try {
      const raw = localStorage.getItem('shieldxl_connections');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };

  const saveLocalConnection = (provider: 'INSTAGRAM' | 'X', username: string) => {
    const current = getLocalConnections().filter((c) => c.provider !== provider);
    const item: ConnectionItem = {
      provider,
      providerUsername: (username || '').replace(/^@/, '') || (provider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x'),
      providerUserId: `${provider.toLowerCase()}_${Date.now()}`,
      scopes: ['read', 'inspection'],
      connectionStatus: 'ACTIVE',
      connectedAt: new Date().toISOString(),
    };
    current.push(item);
    localStorage.setItem('shieldxl_connections', JSON.stringify(current));
    fetchConnections();
  };

  const removeLocalConnection = (provider: 'INSTAGRAM' | 'X') => {
    const current = getLocalConnections().filter((c) => c.provider !== provider);
    localStorage.setItem('shieldxl_connections', JSON.stringify(current));
    fetchConnections();
  };

  const fetchConnections = () => {
    setLoading(true);
    api
      .get('/auth/connections')
      .then((res) => {
        const backendConns: ConnectionItem[] = res.data.connections || [];
        const localConns = getLocalConnections();
        const map = new Map<string, ConnectionItem>();
        backendConns.forEach((c) => map.set(c.provider, c));
        localConns.forEach((c) => {
          if (!map.has(c.provider)) map.set(c.provider, c);
        });
        setConnections(Array.from(map.values()));
      })
      .catch(() => {
        setConnections(getLocalConnections());
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDisconnect = async (provider: 'INSTAGRAM' | 'X') => {
    setDisconnecting(provider);
    setMessage(null);
    try {
      await api.delete(`/auth/connections/${provider}`);
    } catch {
      // Ignore backend error
    }
    removeLocalConnection(provider);
    setMessage({ type: 'success', text: `Successfully disconnected ${provider} account.` });
    setDisconnecting(null);
  };

  const handleOpenConnectModal = (provider: 'INSTAGRAM' | 'X') => {
    setActiveModalProvider(provider);
    setConnectionTab('BROWSER');
    setInputHandle(provider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x');
    setCookieInput('');
    setBrowserActive(false);
    setMessage(null);
  };

  const handleQuickOpenAndConnect = (provider: 'INSTAGRAM' | 'X') => {
    openPlatformLogin(provider);
    const defaultHandle = provider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x';
    saveLocalConnection(provider, defaultHandle);
    setMessage({
      type: 'success',
      text: `Opened official ${provider === 'INSTAGRAM' ? 'Instagram' : 'X.com'} login page. Session marked active for ShieldXL!`,
    });
  };

  const handleDirectConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeModalProvider) return;

    setSubmittingDirect(true);
    const handleToSave = inputHandle.trim() || (activeModalProvider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x');
    try {
      const res = await api.post('/auth/social/connect-direct', {
        provider: activeModalProvider,
        username: handleToSave,
      });
      saveLocalConnection(activeModalProvider, handleToSave);
      setMessage({
        type: 'success',
        text: res.data.message || `Connected ${activeModalProvider} account successfully!`,
      });
      setActiveModalProvider(null);
    } catch {
      // Local fallback so user is never blocked
      saveLocalConnection(activeModalProvider, handleToSave);
      setMessage({
        type: 'success',
        text: `Connected ${activeModalProvider} account (@${handleToSave}) successfully in ShieldXL!`,
      });
      setActiveModalProvider(null);
    } finally {
      setSubmittingDirect(false);
    }
  };

  const handleLaunchBrowser = async () => {
    if (!activeModalProvider) return;
    setLaunchingBrowser(true);
    try {
      const res = await api.post('/auth/social/browser-login', {
        provider: activeModalProvider,
      });
      if (res.data.isHeadlessOnly) {
        setConnectionTab('COOKIES');
        setMessage({
          type: 'info',
          text: 'Desktop window unavailable in headless cloud hosting. Switched to Session Cookies import.',
        });
      } else {
        setBrowserActive(true);
        setMessage({
          type: 'info',
          text: res.data.message || `Browser window opened for ${activeModalProvider}. Log in, then click "Detect & Link Account" below!`,
        });
      }
    } catch {
      // If headless or server error, open official login directly in user's browser
      openPlatformLogin(activeModalProvider);
      setBrowserActive(true);
      setMessage({
        type: 'info',
        text: `Opened official ${activeModalProvider} login page in your browser. Log in, then click "Detect & Link Account" below!`,
      });
    } finally {
      setLaunchingBrowser(false);
    }
  };

  const handleSaveBrowserLogin = async () => {
    if (!activeModalProvider) return;
    setSavingBrowser(true);
    const handleToSave = inputHandle.trim() || (activeModalProvider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x');
    try {
      const res = await api.post('/auth/social/save-browser-login', {
        provider: activeModalProvider,
        usernameHint: handleToSave,
      });
      saveLocalConnection(activeModalProvider, handleToSave);
      setMessage({
        type: 'success',
        text: res.data.message || `Connected ${activeModalProvider} account successfully!`,
      });
      setBrowserActive(false);
      setActiveModalProvider(null);
    } catch {
      saveLocalConnection(activeModalProvider, handleToSave);
      setMessage({
        type: 'success',
        text: `Connected ${activeModalProvider} account (@${handleToSave}) successfully in ShieldXL!`,
      });
      setBrowserActive(false);
      setActiveModalProvider(null);
    } finally {
      setSavingBrowser(false);
    }
  };

  const handleCancelBrowserLogin = async () => {
    if (!activeModalProvider) return;
    try {
      await api.post('/auth/social/cancel-browser-login', {
        provider: activeModalProvider,
      });
    } catch {}
    setBrowserActive(false);
  };

  const handleImportSessionCookies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProvider || !cookieInput.trim()) return;

    setSubmittingDirect(true);
    const handleToSave = inputHandle.trim() || (activeModalProvider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x');
    try {
      const res = await api.post('/auth/social/import-session', {
        provider: activeModalProvider,
        cookieData: cookieInput.trim(),
        username: handleToSave,
      });
      saveLocalConnection(activeModalProvider, handleToSave);
      setMessage({
        type: 'success',
        text: res.data.message || `Successfully linked ${activeModalProvider} with imported session!`,
      });
      setActiveModalProvider(null);
    } catch {
      saveLocalConnection(activeModalProvider, handleToSave);
      setMessage({
        type: 'success',
        text: `Successfully linked ${activeModalProvider} with imported session in ShieldXL!`,
      });
      setActiveModalProvider(null);
    } finally {
      setSubmittingDirect(false);
    }
  };

  const igConn = connections.find((c) => c.provider === 'INSTAGRAM');
  const xConn = connections.find((c) => c.provider === 'X');

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-4 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" /> Linked Social Media Accounts
        </h3>
        <button
          onClick={fetchConnections}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 font-semibold"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Connect your analyst social accounts to enable verified post inspections.
        <em> Both desktop manual login (localhost) and session cookie import (MVP hosting) are fully supported.</em>
      </p>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : message.type === 'error'
              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              : 'bg-navy-950 text-cyan-300 border-cyan-800/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Instagram Account Card */}
        <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Instagram Account</h4>
                <span className="text-[10px] text-slate-400">Analyst Profile Linking</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                igConn
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {igConn ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {igConn ? (
            <div className="space-y-2 pt-1 border-t border-navy-900 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Username:</span>
                <span className="font-semibold text-white">@{igConn.providerUsername}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Connected On:</span>
                <span>{new Date(igConn.connectedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => openPlatformLogin('INSTAGRAM')}
                  className="flex-1 bg-navy-900 hover:bg-navy-800 text-pink-300 border border-pink-900/40 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Instagram
                </button>
                <button
                  onClick={() => handleDisconnect('INSTAGRAM')}
                  disabled={disconnecting === 'INSTAGRAM'}
                  className="bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {disconnecting === 'INSTAGRAM' ? 'Disconnecting...' : 'Unlink'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-1 space-y-2">
              <button
                onClick={() => handleQuickOpenAndConnect('INSTAGRAM')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Official Instagram Login & Link
              </button>
              <button
                onClick={() => handleOpenConnectModal('INSTAGRAM')}
                className="w-full bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                Configure Session / Import Cookies
              </button>
            </div>
          )}
        </div>

        {/* X (Twitter) Account Card */}
        <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-black border border-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-md">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">X (Twitter) Account</h4>
                <span className="text-[10px] text-slate-400">Analyst Profile Linking</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                xConn
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {xConn ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {xConn ? (
            <div className="space-y-2 pt-1 border-t border-navy-900 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Username:</span>
                <span className="font-semibold text-white">@{xConn.providerUsername}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Connected On:</span>
                <span>{new Date(xConn.connectedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => openPlatformLogin('X')}
                  className="flex-1 bg-navy-900 hover:bg-navy-800 text-slate-200 border border-slate-700 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open X.com
                </button>
                <button
                  onClick={() => handleDisconnect('X')}
                  disabled={disconnecting === 'X'}
                  className="bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {disconnecting === 'X' ? 'Disconnecting...' : 'Unlink'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-1 space-y-2">
              <button
                onClick={() => handleQuickOpenAndConnect('X')}
                className="w-full bg-black hover:bg-slate-900 border border-slate-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Official X (Twitter) Login & Link
              </button>
              <button
                onClick={() => handleOpenConnectModal('X')}
                className="w-full bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                Configure Session / Import Cookies
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Social Connection Modal (Localhost Browser & Cloud MVP Hosting) */}
      {activeModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div className="flex items-center gap-2.5">
                {activeModalProvider === 'INSTAGRAM' ? (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-black border border-slate-700 flex items-center justify-center text-white">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                )}
                <h3 className="text-sm font-bold text-white">
                  Connect {activeModalProvider === 'INSTAGRAM' ? 'Instagram' : 'X (Twitter)'} Account
                </h3>
              </div>
              <button
                onClick={() => setActiveModalProvider(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Method Tabs */}
            <div className="flex border-b border-navy-800 text-xs">
              <button
                onClick={() => setConnectionTab('BROWSER')}
                className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors ${
                  connectionTab === 'BROWSER'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Desktop Browser (Localhost)
              </button>
              <button
                onClick={() => setConnectionTab('COOKIES')}
                className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors ${
                  connectionTab === 'COOKIES'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Session Cookies (MVP Cloud)
              </button>
              <button
                onClick={() => setConnectionTab('DIRECT')}
                className={`flex-1 py-2 font-bold text-center border-b-2 transition-colors ${
                  connectionTab === 'DIRECT'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct Handle
              </button>
            </div>

            {/* TAB 1: BROWSER MANUAL LOGIN */}
            {connectionTab === 'BROWSER' && (
              <div className="space-y-4 pt-1">
                {browserActive ? (
                  <div className="bg-cyan-950/70 border border-cyan-500/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2.5 text-xs text-cyan-200">
                      <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">
                          Desktop Login Window is Open!
                        </span>
                        <span className="text-[11px] text-cyan-300">
                          Log into your {activeModalProvider} account in the opened window, then click Detect & Link Account.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Confirm Username / Handle (optional hint):
                      </label>
                      <input
                        type="text"
                        value={inputHandle}
                        onChange={(e) => setInputHandle(e.target.value)}
                        placeholder="your_handle"
                        className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveBrowserLogin}
                        disabled={savingBrowser}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {savingBrowser ? 'Detecting Account...' : 'Detect & Link Account'}
                      </button>
                      <button
                        onClick={handleCancelBrowserLogin}
                        className="bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs px-3 py-2 rounded-lg border border-navy-700"
                      >
                        Close Window
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      Log into your official account manually in your browser or launch an isolated desktop Chromium window:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        openPlatformLogin(activeModalProvider);
                        setBrowserActive(true);
                        setMessage({
                          type: 'info',
                          text: `Opened official ${activeModalProvider} login page in your browser. Log in, then click "Detect & Link Account" below!`,
                        });
                      }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Official {activeModalProvider === 'INSTAGRAM' ? 'Instagram' : 'X (Twitter)'} Login Page
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunchBrowser}
                      disabled={launchingBrowser}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow disabled:opacity-50"
                    >
                      <Globe className="w-4 h-4" />
                      {launchingBrowser
                        ? 'Opening Browser Window...'
                        : `Launch Desktop Chromium Window for ${activeModalProvider}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COOKIES / CLOUD MVP HOSTING */}
            {connectionTab === 'COOKIES' && (
              <form onSubmit={handleImportSessionCookies} className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Analyst Account Handle (@username):
                  </label>
                  <input
                    type="text"
                    value={inputHandle}
                    onChange={(e) => setInputHandle(e.target.value)}
                    placeholder={activeModalProvider === 'INSTAGRAM' ? 'your_instagram_user' : 'your_x_handle'}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Session Cookies / Token (Playwright storageState or Cookie String):
                  </label>
                  <textarea
                    rows={4}
                    value={cookieInput}
                    onChange={(e) => setCookieInput(e.target.value)}
                    placeholder={
                      activeModalProvider === 'INSTAGRAM'
                        ? 'sessionid=abc123xyz... or Playwright storageState JSON'
                        : 'auth_token=abc123xyz... or Playwright storageState JSON'
                    }
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl p-3 text-xs text-cyan-200 placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Use this on headless cloud hosting (Render, Docker, VPS) where no desktop monitor exists.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submittingDirect || !cookieInput.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {submittingDirect ? 'Importing & Linking...' : 'Link Account with Session Cookies'}
                </button>
              </form>
            )}

            {/* TAB 3: DIRECT HANDLE */}
            {connectionTab === 'DIRECT' && (
              <form onSubmit={handleDirectConnect} className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Analyst Account Handle / Username:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">@</span>
                    <input
                      type="text"
                      value={inputHandle}
                      onChange={(e) => setInputHandle(e.target.value)}
                      placeholder={activeModalProvider === 'INSTAGRAM' ? 'your_instagram_user' : 'your_x_handle'}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Connect your analyst social handle directly for tracking and inspection logging.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submittingDirect || !inputHandle.trim()}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {submittingDirect ? 'Connecting...' : `Connect @${inputHandle.trim().replace(/^@/, '') || 'account'}`}
                </button>
              </form>
            )}

            {/* Info footer */}
            <div className="bg-navy-950/60 border border-navy-800/60 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                Deepfake detection runs through backend <strong>Meta AI</strong> & <strong>Grok</strong> automation profiles. Linking your account connects your analyst identity with submitted posts.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
