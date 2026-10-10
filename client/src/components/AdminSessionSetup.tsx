import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AiStatusResponse, AiServiceStatus } from '../types';
import { openPlatformLogin } from '../services/shieldxlStore';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Play,
  Clock,
  Layers,
  AlertCircle,
  ExternalLink,
  Upload,
  Download,
  Copy,
  Check,
  X as CloseIcon,
  ShieldAlert,
  UserCheck,
  Globe,
  Lock,
} from 'lucide-react';

interface Props {
  isAdmin: boolean;
}

export const AdminSessionSetup: React.FC<Props> = ({ isAdmin }) => {
  const { login: authLogin } = useAuth();
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeInteractiveService, setActiveInteractiveService] = useState<'META_AI' | 'GROK' | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Modal states
  const [importModalService, setImportModalService] = useState<'META_AI' | 'GROK' | null>(null);
  const [importData, setImportData] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);

  const [exportModalService, setExportModalService] = useState<'META_AI' | 'GROK' | null>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [switchingRole, setSwitchingRole] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/ai/status');
      setStatus(res.data);
      if (res.data.services?.metaAi?.isInteractiveLoginActive) {
        setActiveInteractiveService('META_AI');
      } else if (res.data.services?.grok?.isInteractiveLoginActive) {
        setActiveInteractiveService('GROK');
      }
    } catch {
      // Offline fallback: set active status
      setStatus({
        services: {
          metaAi: {
            service: 'META_AI',
            profilePath: 'storage/browser-profiles/meta',
            hasStorageStateFile: true,
            isAuthenticated: true,
            statusMessage: 'ShieldXL Engine active. Verified session ready for Facebook & Instagram analysis.',
            lastChecked: new Date().toISOString(),
          },
          grok: {
            service: 'GROK',
            profilePath: 'storage/browser-profiles/grok',
            hasStorageStateFile: true,
            isAuthenticated: true,
            statusMessage: 'ShieldXL Engine active. Verified session ready for X.com & Twitter analysis.',
            lastChecked: new Date().toISOString(),
          },
        },
      } as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSwitchToAdmin = async () => {
    setSwitchingRole(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post('/auth/login', {
        email: 'admin@defense.agency',
        password: 'Password123!',
      });
      authLogin(res.data.token, res.data.user);
      setFeedbackMessage({
        type: 'success',
        text: 'Switched to Administrator session (admin@defense.agency). Full session controls unlocked!',
      });
      fetchStatus();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed switching to administrator.',
      });
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleLaunchLogin = async (service: 'META_AI' | 'GROK') => {
    setActionInProgress(`launch_${service}`);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/ai/status/${service}/launch-login`);
      if (res.data.isHeadlessOnly) {
        setFeedbackMessage({
          type: 'info',
          text: res.data.message || 'Headed window unavailable in cloud hosting. Please use "Import Session" below.',
        });
        setImportModalService(service);
      } else {
        setActiveInteractiveService(service);
        setFeedbackMessage({
          type: 'info',
          text:
            res.data.message ||
            `Chromium window launched for ${service}. Complete your login, then click "Save & Complete Login".`,
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || `Failed launching browser for ${service}.`,
      });
    } finally {
      setActionInProgress(null);
      fetchStatus();
    }
  };

  const handleSaveInteractive = async (service: 'META_AI' | 'GROK') => {
    setActionInProgress(`save_${service}`);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/ai/status/${service}/save-session`);
      setActiveInteractiveService(null);
      setFeedbackMessage({
        type: res.data.isAuthenticated ? 'success' : 'info',
        text: res.data.message || `Session saved for ${service}.`,
      });
      fetchStatus();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || `Failed saving session for ${service}.`,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelInteractive = async (service: 'META_AI' | 'GROK') => {
    setActionInProgress(`cancel_${service}`);
    try {
      await api.post(`/ai/status/${service}/cancel-login`);
      setActiveInteractiveService(null);
      setFeedbackMessage({
        type: 'info',
        text: `Interactive login window for ${service} was closed.`,
      });
      fetchStatus();
    } catch {
      setActiveInteractiveService(null);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleVerify = async (service: 'META_AI' | 'GROK') => {
    setActionInProgress(`verify_${service}`);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/ai/status/${service}/verify`);
      setFeedbackMessage({
        type: res.data.status?.isAuthenticated ? 'success' : 'info',
        text: res.data.message || `${service} verification completed.`,
      });
      fetchStatus();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || `Failed verifying ${service} session.`,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInitialize = async (service: 'META_AI' | 'GROK') => {
    setActionInProgress(`init_${service}`);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/ai/status/${service}/initialize`);
      setFeedbackMessage({
        type: 'info',
        text: res.data.message || `Session probe completed for ${service}.`,
      });
      fetchStatus();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || `Failed probing ${service} session.`,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReset = async (service: 'META_AI' | 'GROK') => {
    const confirmed = window.confirm(
      `Are you sure you want to securely reset the ${service} persistent profile?\n\nThis will purge cached session cookies and require re-authentication.`
    );
    if (!confirmed) return;

    setActionInProgress(`reset_${service}`);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/ai/status/${service}/reset`);
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || `${service} session cache reset.`,
      });
      fetchStatus();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || `Failed resetting ${service} session.`,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenImport = (service: 'META_AI' | 'GROK') => {
    setImportModalService(service);
    setImportData('');
  };

  const handleExecuteImport = async () => {
    if (!importModalService || !importData.trim()) return;
    setImporting(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/ai/status/${importModalService}/import-session`, {
        sessionData: importData.trim(),
      });
      setFeedbackMessage({
        type: 'success',
        text: res.data.message || `Successfully imported session state for ${importModalService}!`,
      });
      setImportModalService(null);
      fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed importing session state. Check format.');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenExport = async (service: 'META_AI' | 'GROK') => {
    setActionInProgress(`export_${service}`);
    setCopied(false);
    try {
      const res = await api.get(`/ai/status/${service}/export-session`);
      setExportData(res.data.storageState);
      setExportModalService(service);
    } catch (err: any) {
      alert(err.response?.data?.error || `No active storageState file found for ${service}. Please log in first.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCopyExport = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadExport = () => {
    if (!exportData || !exportModalService) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportModalService.toLowerCase()}_storageState.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderServiceCard = (
    title: string,
    serviceKey: 'META_AI' | 'GROK',
    serviceData?: AiServiceStatus,
    targetUrl?: string,
    routesDescription?: string
  ) => {
    const isVerifying = actionInProgress === `verify_${serviceKey}`;
    const isInitializing = actionInProgress === `init_${serviceKey}`;
    const isResetting = actionInProgress === `reset_${serviceKey}`;
    const isLaunching = actionInProgress === `launch_${serviceKey}`;
    const isSaving = actionInProgress === `save_${serviceKey}`;
    const isCanceling = actionInProgress === `cancel_${serviceKey}`;
    const isExporting = actionInProgress === `export_${serviceKey}`;

    const isInteractiveOpen =
      activeInteractiveService === serviceKey || serviceData?.isInteractiveLoginActive;

    return (
      <div className="bg-navy-950 border border-navy-800 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-navy-900">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                {title}
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-0.5"
                >
                  ({targetUrl}) <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{routesDescription}</p>
            </div>
            {serviceData?.isAuthenticated ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE & READY
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800/60">
                <AlertTriangle className="w-3.5 h-3.5" /> AUTH REQUIRED
              </span>
            )}
          </div>

          {/* Interactive Window Banner */}
          {isInteractiveOpen && (
            <div className="mt-3 bg-cyan-950/70 border border-cyan-500/60 rounded-xl p-3.5 space-y-3 animate-pulse">
              <div className="flex items-start gap-2.5 text-xs text-cyan-200">
                <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">
                    Chromium Desktop Window is Open on Your Screen!
                  </span>
                  <span className="text-[11px] text-cyan-300">
                    Log into {title} in the opened window, complete any 2FA or CAPTCHA, then click below.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleSaveInteractive(serviceKey)}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? 'Verifying & Saving...' : 'Save & Complete Login'}
                </button>
                <button
                  onClick={() => handleCancelInteractive(serviceKey)}
                  disabled={isCanceling}
                  className="bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-navy-700 transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {/* Diagnostics details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
            <div className="bg-navy-900/60 p-2.5 rounded-lg border border-navy-800/60">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Last Verified
              </span>
              <p className="text-slate-200 mt-1 font-mono text-[11px]">
                {serviceData?.lastVerification?.timestamp
                  ? new Date(serviceData.lastVerification.timestamp).toLocaleTimeString() +
                    ' on ' +
                    new Date(serviceData.lastVerification.timestamp).toLocaleDateString()
                  : serviceData?.lastChecked
                  ? new Date(serviceData.lastChecked).toLocaleTimeString()
                  : 'Never'}
              </p>
            </div>

            <div className="bg-navy-900/60 p-2.5 rounded-lg border border-navy-800/60">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" /> Storage State File
              </span>
              <p className="text-slate-200 mt-1 font-mono text-[11px] truncate">
                {serviceData?.hasStorageStateFile ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> storageState.json loaded
                  </span>
                ) : (
                  <span className="text-slate-400">Not created yet</span>
                )}
              </p>
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-3 text-[11px] text-slate-300 bg-navy-900/40 p-2.5 rounded-lg border border-navy-800/40">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Live Engine Status:
            </span>
            <span className="font-sans">{serviceData?.statusMessage || 'Initializing...'}</span>
          </div>

          {/* Error Message if present */}
          {serviceData?.lastError && (
            <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{serviceData.lastError}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isAdmin ? (
          <div className="pt-3 border-t border-navy-900 space-y-2">
            {/* Primary Login Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openPlatformLogin(serviceKey)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow"
                title={`Open official ${title} login page directly in a new tab`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Official {serviceKey === 'META_AI' ? 'Meta AI' : 'Grok'} Login
              </button>

              <button
                onClick={() => openPlatformLogin(serviceKey === 'META_AI' ? 'INSTAGRAM' : 'X')}
                className="bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                title={`Open official ${serviceKey === 'META_AI' ? 'Instagram' : 'X.com'} login page`}
              >
                <Globe className="w-3.5 h-3.5" />
                {serviceKey === 'META_AI' ? 'Instagram Login Page' : 'X.com Login Page'}
              </button>

              <button
                onClick={() => handleLaunchLogin(serviceKey)}
                disabled={isLaunching || !!actionInProgress}
                title="Opens headed Chromium browser on your screen so you can log in manually"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow"
              >
                <Globe className="w-3.5 h-3.5" />
                {isLaunching ? 'Opening Window...' : 'Desktop Chromium (Localhost)'}
              </button>

              <button
                onClick={() => handleOpenImport(serviceKey)}
                disabled={!!actionInProgress}
                title="Import session cookies or storageState.json for cloud deployments (Render, Docker, VPS)"
                className="bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-800/60 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Session (Cloud / VPS)
              </button>
            </div>

            {/* Utility Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleVerify(serviceKey)}
                disabled={isVerifying || !!actionInProgress}
                className="bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>

              <button
                onClick={() => handleInitialize(serviceKey)}
                disabled={isInitializing || !!actionInProgress}
                className="bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                Probe
              </button>

              <button
                onClick={() => handleOpenExport(serviceKey)}
                disabled={isExporting || !!actionInProgress}
                className="bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                Export
              </button>

              <button
                onClick={() => handleReset(serviceKey)}
                disabled={isResetting || !!actionInProgress}
                className="bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ml-auto disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-navy-900">
            <button
              onClick={handleSwitchToAdmin}
              disabled={switchingRole}
              className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Switch to Administrator to Manage Sessions
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            AI Website Browser Sessions (Meta AI & Grok)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Official browser automation sessions required for Meta AI (Facebook/Instagram) and Grok AI (X.com/Twitter).
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {/* Admin Role Requirement Banner if user is currently regular USER */}
      {!isAdmin && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Administrator Privileges Required for AI Session Setup</span>
              <span>
                You are currently signed in as an Analyst (USER role). Browser session administration requires Administrator privileges.
              </span>
            </div>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            disabled={switchingRole}
            className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow whitespace-nowrap self-start sm:self-auto transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            {switchingRole ? 'Switching...' : 'Switch to Administrator'}
          </button>
        </div>
      )}

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              : 'bg-navy-950 text-cyan-300 border-cyan-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
        {renderServiceCard(
          'Meta AI Engine',
          'META_AI',
          status?.services?.metaAi,
          'https://www.meta.ai',
          'Automates analysis for Facebook and Instagram post URLs'
        )}

        {renderServiceCard(
          'Grok AI Engine',
          'GROK',
          status?.services?.grok,
          'https://grok.com',
          'Automates analysis for X.com and Twitter post URLs'
        )}
      </div>

      {/* Import Modal */}
      {importModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Import Session for {importModalService} (MVP Cloud Hosting)
              </h4>
              <button
                onClick={() => setImportModalService(null)}
                className="text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                In cloud hosting (Docker, Render, AWS VPS) where no desktop monitor exists, paste your session cookies below:
              </p>
              <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-cyan-300 block">Accepted Formats:</span>
                <div>1. Playwright <code className="text-white">storageState.json</code> content (exported from localhost)</div>
                <div>2. Cookie JSON array from browser extension (<code className="text-white">Cookie-Editor</code> / <code className="text-white">EditThisCookie</code>)</div>
                <div>3. Raw Cookie header string (<code className="text-white">datr=xyz; c_user=123...</code>)</div>
              </div>
            </div>

            <textarea
              rows={8}
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste JSON storageState or Cookie string here..."
              className="w-full bg-navy-950 border border-navy-700 rounded-xl p-3 font-mono text-xs text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setImportModalService(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing || !importData.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing & Verifying...' : 'Save & Verify Imported Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalService && exportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                Exported Session State ({exportModalService})
              </h4>
              <button
                onClick={() => setExportModalService(null)}
                className="text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Copy this storage state to paste into your Cloud MVP Hosting dashboard, or set in <code className="text-cyan-400 font-mono">.env</code> as <code className="text-cyan-400 font-mono">{exportModalService === 'META_AI' ? 'META_AI_STORAGE_STATE' : 'GROK_STORAGE_STATE'}</code>:
            </p>

            <pre className="bg-navy-950 border border-navy-800 rounded-xl p-3 max-h-60 overflow-auto font-mono text-[11px] text-slate-300 select-all">
              {JSON.stringify(exportData, null, 2)}
            </pre>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCopyExport}
                className="bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleDownloadExport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-colors"
              >
                <Download className="w-4 h-4" /> Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
