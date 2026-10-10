import React from 'react';
import { ResultCategory } from '../types';
import { AlertTriangle, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

interface Props {
  category?: ResultCategory;
  className?: string;
}

export const ResultCategoryBadge: React.FC<Props> = ({ category, className = '' }) => {
  if (!category) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
        IN_PROGRESS
      </span>
    );
  }

  switch (category) {
    case 'POTENTIAL_MANIPULATION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-sm ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          POTENTIAL MANIPULATION
        </span>
      );

    case 'NO_STRONG_SIGNALS_DETECTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm ${className}`}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          NO STRONG SIGNALS DETECTED
        </span>
      );

    case 'INCONCLUSIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-950/60 text-yellow-300 border border-yellow-500/40 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
          INCONCLUSIVE
        </span>
      );

    case 'UNABLE_TO_ANALYZE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/70 text-purple-300 border border-purple-500/40 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
          UNABLE TO ANALYZE
        </span>
      );

    case 'ANALYSIS_FAILED':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          ANALYSIS FAILED
        </span>
      );
  }
};
