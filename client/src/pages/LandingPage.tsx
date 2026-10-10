import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PlatformDetection } from '../types';
import { PlatformBadge } from '../components/PlatformBadge';
import { detectPlatformLocal } from '../services/shieldxlStore';
import { ArrowRight, CheckCircle2, Cpu, Eye, ShieldCheck, Zap, Activity } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<PlatformDetection | null>(null);
  const navigate = useNavigate();

  const handleTestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setDetecting(true);

    try {
      const res = await api.post('/platform/detect', { url: url.trim() });
      setDetection(res.data);
    } catch {
      // Unrestricted client-side fallback
      const localResult = detectPlatformLocal(url.trim());
      setDetection(localResult);
    } finally {
      setDetecting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { state: { prefilledUrl: url } });
  };

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide uppercase shadow-lg shadow-cyan-950/50">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            ShieldXL Automated Forensics Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Shield<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">XL</span> — AI-Powered{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Deepfake Detection</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Forensic media intelligence across social networks. ShieldXL routes Facebook and Instagram posts to <strong className="text-cyan-300">Meta AI</strong>, and X (Twitter) posts to <strong className="text-cyan-300">Grok</strong> using authorized browser automation—delivering certified deepfake verdicts and forensic telemetry.
          </p>

          {/* Quick Interactive URL Inspector */}
          <div className="max-w-2xl mx-auto mt-8 bg-navy-900/90 border border-navy-700/80 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleTestUrl} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Paste Facebook, Instagram, or X.com / Twitter post URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={detecting || !url.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-navy-950 font-bold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20"
                >
                  {detecting ? 'Detecting...' : 'Detect Platform'}
                </button>
              </div>

              {/* Instant Detection Result Banner */}
              {detection && (
                <div className="bg-navy-950/90 border border-cyan-500/30 rounded-xl p-4 text-left space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={detection.platform} />
                      <span className="text-xs text-slate-400 font-mono">
                        {detection.hostname}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      Routes to: {detection.selectedAiWebsite === 'META_AI' ? 'Meta AI (Llama Vision)' : 'Grok (Grok-2 Vision)'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono break-all bg-navy-900/60 p-2 rounded border border-navy-800">
                    {detection.normalizedUrl}
                  </p>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleGoToDashboard}
                      className="inline-flex items-center gap-2 text-xs font-bold text-navy-950 bg-cyan-400 hover:bg-cyan-300 px-4 py-2 rounded-lg transition-colors shadow"
                    >
                      Run Full Forensic Analysis <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Quick Platform Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 bg-navy-900/60 border border-navy-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Meta AI &bull; Instagram & Facebook
            </span>
            <span className="flex items-center gap-1.5 bg-navy-900/60 border border-navy-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Grok AI &bull; X.com & Twitter
            </span>
            <span className="flex items-center gap-1.5 bg-navy-900/60 border border-navy-800 px-3 py-1.5 rounded-lg">
              <Zap className="w-4 h-4 text-cyan-400" />
              Live Telemetry & Certified Reports
            </span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            How ShieldXL Dissects Synthetic Media
          </h2>
          <p className="text-xs text-slate-400">
            Multi-spectral inspection combining frontier vision AI and automated browser telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-navy-900/70 border border-navy-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Spatial Face Warping</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects Gaussian boundary feathering, diffusion checkerboard grid artifacts, and unnatural ear/jawline blend seams generated by face-swap models.
            </p>
          </div>

          <div className="bg-navy-900/70 border border-navy-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Phoneme-Viseme Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Measures sub-150ms temporal desynchronization between acoustic consonant release and visual lip articulation indicating AI voice conversion.
            </p>
          </div>

          <div className="bg-navy-900/70 border border-navy-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Direct AI Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leverages direct Meta AI and Grok web browser sessions to query state-of-the-art vision models without synthetic fallbacks or API mockups.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
