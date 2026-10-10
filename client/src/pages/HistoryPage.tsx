import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { AnalysisItem } from '../types';
import { PlatformBadge } from '../components/PlatformBadge';
import { ResultCategoryBadge } from '../components/ResultCategoryBadge';
import { getStoredJobs } from '../services/shieldxlStore';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, ArrowUpRight, ShieldCheck } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [items, setItems] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');

      if (search.trim()) params.append('search', search.trim());
      if (platformFilter) params.append('platform', platformFilter);
      if (categoryFilter) params.append('resultCategory', categoryFilter);

      const res = await api.get(`/analysis?${params.toString()}`);
      if (res.data.items && res.data.items.length > 0) {
        setItems(res.data.items);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || res.data.items.length);
        setLoading(false);
        return;
      }
    } catch {
      // Offline fallback
    }

    // Local storage fallback
    let allLocal = getStoredJobs();
    if (search.trim()) {
      const q = search.toLowerCase();
      allLocal = allLocal.filter(
        (j) =>
          j.originalUrl?.toLowerCase().includes(q) ||
          j.normalizedUrl?.toLowerCase().includes(q) ||
          j._id.toLowerCase().includes(q)
      );
    }
    if (platformFilter) {
      allLocal = allLocal.filter((j) => j.platform === platformFilter);
    }
    if (categoryFilter) {
      allLocal = allLocal.filter((j) => j.resultCategory === categoryFilter);
    }

    setItems(allLocal.slice((page - 1) * 10, page * 10));
    setTotalCount(allLocal.length);
    setTotalPages(Math.max(1, Math.ceil(allLocal.length / 10)));
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [page, platformFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            ShieldXL Investigation Archive
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and inspect all submitted social media media investigations ({totalCount} total cases logged).
          </p>
        </div>

        <Link
          to="/dashboard"
          className="bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-4 py-2 rounded-xl text-xs shadow self-start sm:self-auto"
        >
          + New Forensic Analysis
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by URL or Case ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setPage(1);
              }}
              className="bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">All Platforms</option>
              <option value="META">Meta (FB / IG)</option>
              <option value="X">X (Twitter)</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Verdicts</option>
            <option value="POTENTIAL_MANIPULATION">Potential Manipulation</option>
            <option value="NO_STRONG_SIGNALS_DETECTED">Authentic Media</option>
          </select>
        </div>
      </div>

      {/* Investigations Table / List */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading cases...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No analyses found matching your query.
          </div>
        ) : (
          <div className="divide-y divide-navy-800">
            {items.map((job) => (
              <div
                key={job._id}
                className="p-5 hover:bg-navy-850/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={job.platform} />
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      Engine: {job.aiWebsite}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {job._id}</span>
                  </div>

                  <p className="text-xs font-mono text-slate-200 truncate max-w-2xl">
                    {job.originalUrl || job.uploadedFileName}
                  </p>

                  {job.observations && job.observations.length > 0 && (
                    <p className="text-[11px] text-slate-400 truncate max-w-xl">
                      &bull; {job.observations[0]}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <ResultCategoryBadge category={job.resultCategory} />
                    {job.isManipulatedProbability != null && (
                      <span className="block text-[10px] font-mono text-slate-400 mt-1">
                        Confidence: {(job.isManipulatedProbability * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/results/${job._id}`}
                    className="bg-navy-950 hover:bg-navy-800 border border-navy-700 text-cyan-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                  >
                    Report <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-navy-950/60 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-navy-900 border border-navy-800 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-navy-900 border border-navy-800 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
