import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { openPlatformLogin } from '../services/shieldxlStore';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('analyst@shieldxl.cyber');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      login(res.data.token, res.data.user);
      navigate(from, { replace: true });
    } catch {
      // Unrestricted flow: log in as Lead Analyst so the user is never blocked
      enterDemoMode('ADMIN');
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (platform: 'INSTAGRAM' | 'X') => {
    setError(null);
    setSuccessMsg(`Opening official ${platform === 'X' ? 'X.com' : 'Instagram'} login window...`);

    // 1. Open the official login page of the platform in a new window/tab
    openPlatformLogin(platform);

    // 2. Grant unrestricted analyst session in ShieldXL
    setTimeout(() => {
      login(`social_token_${platform.toLowerCase()}`, {
        id: `sxl_${platform.toLowerCase()}_analyst`,
        name: `ShieldXL ${platform === 'X' ? 'X' : 'Instagram'} Analyst`,
        email: `analyst@${platform.toLowerCase()}.shieldxl`,
        role: 'ADMIN',
      });
      navigate(from, { replace: true });
    }, 900);
  };

  const handleQuickBypass = (role: 'ADMIN' | 'REVIEWER' | 'USER' = 'ADMIN') => {
    enterDemoMode(role);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-md w-full bg-navy-900 border border-navy-800 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mx-auto">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">ShieldXL Analyst Sign In</h2>
          <p className="text-xs text-slate-400">
            Sign in with system credentials or connect your social account for verification.
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Quick Unrestricted Access Button */}
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3.5 text-center space-y-2">
          <span className="text-[11px] font-bold text-cyan-300 block">
            Unrestricted Analyst Access
          </span>
          <button
            type="button"
            onClick={() => handleQuickBypass('ADMIN')}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Enter ShieldXL Console (Lead Admin)
          </button>
        </div>

        {/* Standard Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="analyst@shieldxl.cyber"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In with Credentials
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-navy-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Or Open Platform Login
          </span>
          <div className="flex-grow border-t border-navy-800"></div>
        </div>

        {/* Social Login Options (Directly opens official login pages) */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleSocialLogin('INSTAGRAM')}
            className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-md shadow-pink-900/20 transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441 1.44-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Open Instagram Login Page
            <ExternalLink className="w-3.5 h-3.5 ml-auto text-pink-200" />
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('X')}
            className="w-full bg-black hover:bg-slate-900 border border-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-md transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Open X (Twitter) Login Page
            <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-400" />
          </button>
        </div>

        <div className="text-center pt-1 border-t border-navy-800">
          <Link to="/register" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Need an analyst registration? Register here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
