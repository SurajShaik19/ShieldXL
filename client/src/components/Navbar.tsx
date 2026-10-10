import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Bell, History, Settings, ShieldCheck, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-navy-900 border-b border-navy-700/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                Shield<span className="text-cyan-400">XL</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-navy-800 text-cyan-400 border border-cyan-500/30">
                AI Intelligence
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'bg-navy-800 text-cyan-400' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Analyze
            </Link>

            {user && (
              <>
                <Link
                  to="/history"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/history') ? 'bg-navy-800 text-cyan-400' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                  }`}
                >
                  <History className="w-4 h-4" />
                  History
                </Link>

                <Link
                  to="/notifications"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/notifications') ? 'bg-navy-800 text-cyan-400' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Alerts
                </Link>

                {(user.role === 'REVIEWER' || user.role === 'ADMIN') && (
                  <Link
                    to="/reviewer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/reviewer') ? 'bg-navy-800 text-cyan-400' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Reviewer Queue
                  </Link>
                )}

                <Link
                  to="/settings"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/settings') ? 'bg-navy-800 text-cyan-400' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </>
            )}
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm bg-navy-800/80 px-3 py-1.5 rounded-lg border border-navy-700">
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-slate-200">{user.name}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-2 py-1.5 rounded transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-md hover:bg-navy-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 px-4 py-2 rounded-md shadow transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
