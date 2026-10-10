import React from 'react';
import { Platform } from '../types';

interface Props {
  platform: Platform;
  className?: string;
}

export const PlatformBadge: React.FC<Props> = ({ platform, className = '' }) => {
  if (platform === 'META') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-cyan-400 border border-cyan-500/30 shadow-sm ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
        Meta (FB / IG)
      </span>
    );
  }

  if (platform === 'X') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-charcoal-800 text-slate-200 border border-slate-700 shadow-sm ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
        X (Twitter)
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40 ${className}`}
    >
      Unsupported
    </span>
  );
};
