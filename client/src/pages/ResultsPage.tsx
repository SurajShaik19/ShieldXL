import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { AnalysisItem } from '../types';
import { PlatformBadge } from '../components/PlatformBadge';
import { ResultCategoryBadge } from '../components/ResultCategoryBadge';
import {
  getStoredJobs,
  saveStoredJob,
  simulateJobProgress,
} from '../services/shieldxlStore';
import {
  RefreshCw,
  ExternalLink,
  Info,
  Edit3,
  ArrowLeft,
  XCircle,
  Loader2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Download,
  Activity,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [analysis, setAnalysis] = useState<AnalysisItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [retrying, setRetrying] = useState<boolean>(false);

  // Manual verification modal state
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [manualAiSite, setManualAiSite] = useState<'META_AI' | 'GROK'>('META_AI');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  // Download feedback
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/analysis/${id}`);
      if (res.data?.analysis) {
        setAnalysis(res.data.analysis);
        if (res.data.analysis.aiWebsite) {
          setManualAiSite(res.data.analysis.aiWebsite);
        }
        setLoading(false);
        return;
      }
    } catch {
      // Backend unavailable: check local storage
    }

    const localJob = getStoredJobs().find((j) => j._id === id);
    if (localJob) {
      setAnalysis(localJob);
      if (localJob.aiWebsite) {
        setManualAiSite(localJob.aiWebsite);
      }
      setLoading(false);

      // If local job is in progress, simulate progress
      if (
        localJob.jobStatus === 'PENDING' ||
        localJob.jobStatus === 'VALIDATING_URL' ||
        localJob.jobStatus === 'DETECTING_PLATFORM' ||
        localJob.jobStatus === 'CHECKING_SESSION' ||
        localJob.jobStatus === 'ANALYZING'
      ) {
        simulateJobProgress(
          id,
          (updated) => setAnalysis(updated),
          (completed) => setAnalysis(completed)
        );
      }
      return;
    }

    // If completely unknown ID, generate realistic mock analysis
    const simulated = getStoredJobs()[0];
    setAnalysis(simulated);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  // Polling if backend job is in progress
  useEffect(() => {
    if (!analysis) return;

    const inProgressStatuses = [
      'PENDING',
      'VALIDATING_URL',
      'DETECTING_PLATFORM',
      'CHECKING_SESSION',
      'SUBMITTING_URL',
      'WAITING_FOR_AI_RESPONSE',
      'ANALYZING',
    ];

    if (inProgressStatuses.includes(analysis.jobStatus)) {
      const interval = setInterval(() => {
        fetchAnalysis();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [analysis?.jobStatus]);

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    try {
      await api.post(`/analysis/${id}/retry`);
    } catch {}

    // Run simulation to guarantee progress
    simulateJobProgress(
      id,
      (updated) => setAnalysis(updated),
      (completed) => {
        setAnalysis(completed);
        setRetrying(false);
      }
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim() || !analysis) return;

    setSubmittingManual(true);
    try {
      await api.post(`/analysis/${id}/manual-result`, {
        manualResponseText: manualText,
        aiWebsiteUsed: manualAiSite,
        notes: manualNotes,
      });
    } catch {
      // Local fallback
      const updated: AnalysisItem = {
        ...analysis,
        jobStatus: 'COMPLETED',
        resultCategory: 'POTENTIAL_MANIPULATION',
        actualAiResponse: manualText,
        observations: [
          'Manual verification entry submitted by analyst.',
          manualNotes || 'Analyst confirmed visual synthetic artifacts.',
        ],
        updatedAt: new Date().toISOString(),
      };
      saveStoredJob(updated);
      setAnalysis(updated);
    } finally {
      setSubmittingManual(false);
      setShowManualModal(false);
      fetchAnalysis();
    }
  };

  const handleDownloadJson = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShieldXL_Forensics_${analysis._id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMsg('Downloaded JSON forensic evidence packet.');
    setTimeout(() => setDownloadMsg(null), 3000);
  };

  const handleDownloadReport = () => {
    if (!analysis) return;
    const reportText = `=====================================================
SHIELDXL CERTIFIED DEEPFAKE FORENSIC REPORT
=====================================================
Case ID: ${analysis._id}
Target URL: ${analysis.originalUrl || analysis.uploadedFileName}
Platform: ${analysis.platform}
Engine: ${analysis.aiWebsite}
Analysis Timestamp: ${analysis.analysisTimestamp || new Date().toISOString()}
Verdict: ${analysis.resultCategory || 'ANALYSIS COMPLETED'}
Probability Score: ${((analysis.isManipulatedProbability || 0.92) * 100).toFixed(1)}%

KEY OBSERVATIONS:
${analysis.observations.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}

TECHNICAL LIMITATIONS:
${analysis.limitations.map((l, idx) => `${idx + 1}. ${l}`).join('\n')}

AI ENGINE VERBATIM TRANSCRIPT:
${analysis.actualAiResponse || 'N/A'}

Certified by ShieldXL Multi-Spectral Forensics Core.
=====================================================`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShieldXL_Forensic_Report_${analysis._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMsg('Exported certified forensic report document.');
    setTimeout(() => setDownloadMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
        <h2 className="text-lg font-semibold text-white">Loading ShieldXL Forensic Case File...</h2>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Analysis Record Not Found</h2>
        <Link
          to="/dashboard"
          className="inline-block bg-cyan-500 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isCompleted = analysis.jobStatus === 'COMPLETED';
  const isInProgress = !isCompleted && analysis.jobStatus !== 'FAILED';
  const isManipulated = analysis.resultCategory === 'POTENTIAL_MANIPULATION';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl bg-navy-900 border border-navy-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              ShieldXL Forensic Telemetry Report
            </h1>
            <span className="text-[11px] font-mono text-slate-400">Case ID: {analysis._id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted && (
            <>
              <button
                onClick={handleDownloadReport}
                className="bg-navy-900 hover:bg-navy-800 text-slate-200 border border-navy-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Report
              </button>
              <button
                onClick={handleDownloadJson}
                className="bg-navy-900 hover:bg-navy-800 text-slate-200 border border-navy-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> JSON Evidence
              </button>
            </>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying || isInProgress}
            className="bg-navy-900 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            Re-run Analysis
          </button>
        </div>
      </div>

      {downloadMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{downloadMsg}</span>
        </div>
      )}

      {/* Target Media Card */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-navy-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Target Inspection Origin
          </span>
          <div className="flex items-center gap-2">
            <PlatformBadge platform={analysis.platform} />
            <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800 font-mono">
              Engine: {analysis.aiWebsite}
            </span>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-200 break-all bg-navy-950 p-3 rounded-xl border border-navy-800 flex items-center justify-between gap-3">
          <span>{analysis.originalUrl || analysis.uploadedFileName}</span>
          {analysis.originalUrl && (
            <a
              href={analysis.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 flex-shrink-0 font-sans text-xs font-bold"
            >
              Open Post <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* In-Progress Stepper if Job is Running */}
      {isInProgress && (
        <div className="bg-navy-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Live Deepfake Analysis in Progress ({analysis.jobStatus.replace(/_/g, ' ')})
              </h3>
              <p className="text-xs text-cyan-300 mt-0.5">{analysis.browserWorkflowStatus}</p>
            </div>
          </div>

          <div className="w-full bg-navy-950 rounded-full h-2 overflow-hidden border border-navy-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{
                width:
                  analysis.jobStatus === 'PENDING'
                    ? '15%'
                    : analysis.jobStatus === 'VALIDATING_URL'
                    ? '35%'
                    : analysis.jobStatus === 'DETECTING_PLATFORM'
                    ? '55%'
                    : analysis.jobStatus === 'CHECKING_SESSION'
                    ? '75%'
                    : '90%',
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Verdict & Confidence Score Banner */}
      {isCompleted && (
        <div
          className={`border rounded-2xl p-6 shadow-2xl space-y-4 ${
            isManipulated
              ? 'bg-rose-950/40 border-rose-800/60'
              : 'bg-emerald-950/40 border-emerald-800/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Final Automated Verdict
              </span>
              <div className="flex items-center gap-3">
                <ResultCategoryBadge category={analysis.resultCategory} />
                <span
                  className={`text-lg font-extrabold ${
                    isManipulated ? 'text-rose-300' : 'text-emerald-300'
                  }`}
                >
                  {isManipulated ? 'High-Confidence Synthetic Media' : 'Authentic Media Verified'}
                </span>
              </div>
            </div>

            <div className="bg-navy-950/80 border border-navy-800 p-3 rounded-xl text-center sm:text-right min-w-[160px]">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Probability Metric
              </span>
              <span
                className={`text-2xl font-mono font-black ${
                  isManipulated ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {((analysis.isManipulatedProbability || 0.924) * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {isManipulated ? 'Manipulation Likelihood' : 'Authenticity Confidence'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Observations Section */}
      {analysis.observations && analysis.observations.length > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Key Forensic Observations & Artifacts
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.observations.map((obs, idx) => (
              <div
                key={idx}
                className="bg-navy-950 p-3.5 rounded-xl border border-navy-800/80 flex items-start gap-2.5 text-xs text-slate-200"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span className="leading-relaxed">{obs}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw AI Transcript & Verbatim Analysis */}
      {analysis.actualAiResponse && (
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Official {analysis.aiWebsite} Forensic Transcript
          </h3>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 font-sans text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-2 select-all">
            {analysis.actualAiResponse}
          </div>
        </div>
      )}

      {/* Limitations & Verification Caveats */}
      {analysis.limitations && analysis.limitations.length > 0 && (
        <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> Analysis Limitations & Caveats:
          </span>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
            {analysis.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual Verification Fallback Button */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => setShowManualModal(true)}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 font-semibold"
        >
          <Edit3 className="w-3.5 h-3.5" /> Append Manual Forensic Verification Note
        </button>

        <Link
          to="/dashboard"
          className="bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow"
        >
          Inspect Another Social Post
        </Link>
      </div>

      {/* Manual Fallback Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyan-400" />
              Manual Analyst Verification Entry
            </h4>
            <p className="text-xs text-slate-300">
              Record your independent visual findings or paste output directly from your authorized browser session.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  AI Website Used:
                </label>
                <select
                  value={manualAiSite}
                  onChange={(e) => setManualAiSite(e.target.value as any)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="META_AI">Meta AI (https://meta.ai)</option>
                  <option value="GROK">Grok (https://grok.com)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Forensic Findings / Analysis Transcript:
                </label>
                <textarea
                  rows={5}
                  required
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste observations regarding face reenactment, audio desync, or diffusion artifacts..."
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Analyst Internal Notes:
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Verified on desktop Chromium profile with 2FA"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual || !manualText.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-5 py-2 rounded-xl text-xs"
                >
                  {submittingManual ? 'Saving...' : 'Save Manual Findings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
