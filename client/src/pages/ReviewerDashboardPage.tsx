import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AnalysisItem } from '../types';
import { getStoredJobs, saveStoredJob, addNotification } from '../services/shieldxlStore';
import { PlatformBadge } from '../components/PlatformBadge';
import { ResultCategoryBadge } from '../components/ResultCategoryBadge';
import { ShieldCheck, CheckCircle, ExternalLink, UserCheck, Sparkles } from 'lucide-react';

export const ReviewerDashboardPage: React.FC = () => {
  const { user, enterDemoMode } = useAuth();
  const [cases, setCases] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCase, setSelectedCase] = useState<AnalysisItem | null>(null);

  // Decision Form State
  const [decision, setDecision] = useState<string>('CONFIRMED_MANIPULATION');
  const [notes, setNotes] = useState<string>('');
  const [escalation, setEscalation] = useState<string>('NONE');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews');
      if (res.data?.cases && res.data.cases.length > 0) {
        setCases(res.data.cases);
        if (!selectedCase) {
          setSelectedCase(res.data.cases[0]);
        }
        return;
      }
    } catch {
      // Backend offline or empty
    } finally {
      setLoading(false);
    }

    // Fallback: load jobs from ShieldXL store
    const stored = getStoredJobs();
    setCases(stored);
    if (stored.length > 0 && !selectedCase) {
      setSelectedCase(stored[0]);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !notes.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      await api.post(`/reviews/${selectedCase._id}/decision`, {
        decision,
        notes,
        escalationStatus: escalation,
      });
    } catch {
      // Offline fallback: save locally
    }

    const updated: AnalysisItem = {
      ...selectedCase,
      requiresReview: false,
      reviewerDecision: {
        decision: decision as any,
        notes,
        reviewerId: user?.id || 'lead_reviewer',
        reviewedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    saveStoredJob(updated);
    setSelectedCase(updated);
    addNotification({
      type: 'ANALYSIS_COMPLETED',
      message: `ShieldXL Reviewer: Case ${selectedCase._id.slice(0, 10)} recorded as ${decision.replace(/_/g, ' ')}.`,
      channel: 'IN_APP',
    });

    setSuccessMsg('Reviewer verdict saved and forensic certificate updated.');
    setNotes('');
    setSubmitting(false);
    fetchCases();
  };

  if (user?.role !== 'REVIEWER' && user?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-cyan-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Reviewer Moderation Console</h2>
        <p className="text-sm text-slate-400">
          Click below to access the moderation queue as Lead Forensic Reviewer.
        </p>
        <button
          onClick={() => enterDemoMode('REVIEWER')}
          className="bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-6 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 shadow"
        >
          <Sparkles className="w-4 h-4" />
          Activate Reviewer Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-cyan-400" />
          Reviewer Moderation Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review cases flagged for potential manipulation, ambiguity, or manual sign-off.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case List Column */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-navy-800">
            <span className="text-xs font-bold uppercase text-slate-400">
              Pending Cases ({cases.length})
            </span>
            <button onClick={fetchCases} className="text-xs text-cyan-400 hover:underline">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No pending cases requiring review at this time.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {cases.map((c) => (
                <div
                  key={c._id}
                  onClick={() => {
                    setSelectedCase(c);
                    setSuccessMsg(null);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCase?._id === c._id
                      ? 'bg-navy-800 border-cyan-500/50 shadow-md'
                      : 'bg-navy-950/60 border-navy-800 hover:bg-navy-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <PlatformBadge platform={c.platform} />
                    <ResultCategoryBadge category={c.resultCategory} />
                  </div>
                  <p className="text-xs text-slate-300 font-mono truncate">
                    {c.originalUrl || c.uploadedFileName || 'Media Upload'}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
                    <span>Engine: {c.aiWebsite}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Case Inspection & Decision Column */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCase ? (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={selectedCase.platform} />
                    <ResultCategoryBadge category={selectedCase.resultCategory} />
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-1 block">
                    Job ID: {selectedCase._id}
                  </span>
                </div>

                {selectedCase.originalUrl && (
                  <a
                    href={selectedCase.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
                  >
                    Open Post Link <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Model Output */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Extracted {selectedCase.aiWebsite} Model Response
                </span>
                <div className="bg-navy-950 border border-navy-800 rounded-xl p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedCase.actualAiResponse || 'No direct model text recorded.'}
                </div>
              </div>

              {/* Observations */}
              {selectedCase.observations && selectedCase.observations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400">
                    Model Observations
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {selectedCase.observations.map((o, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5"></span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reviewer Decision Form */}
              <form onSubmit={handleDecisionSubmit} className="pt-4 border-t border-navy-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  Submit Reviewer Verdict
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Final Classification
                    </label>
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white"
                    >
                      <option value="CONFIRMED_MANIPULATION">Confirmed Manipulation (Deepfake)</option>
                      <option value="CONFIRMED_AUTHENTIC">Confirmed Authentic</option>
                      <option value="INCONCLUSIVE_REVIEW">Inconclusive Review</option>
                      <option value="FLAGGED_FOR_ESCALATION">Flagged For Tier-2 Escalation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Escalation Status
                    </label>
                    <select
                      value={escalation}
                      onChange={(e) => setEscalation(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white"
                    >
                      <option value="NONE">None (Resolved)</option>
                      <option value="ESCALATED_TO_TIER2">Escalate to Forensic Tier 2</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reviewer Analysis Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter analytical rationale, visual indicators cross-referenced, and corroborating evidence..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {successMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {successMsg}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !notes.trim()}
                    className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-navy-950 font-bold px-6 py-2.5 rounded-xl text-xs shadow transition-all"
                  >
                    {submitting ? 'Submitting Verdict...' : 'Submit Final Verdict'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
              Select a case from the queue to inspect details and submit verdict.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
