import { useState, useMemo, useEffect } from 'react';
import type { EngulfingSignal } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Filter, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Globe, Shield } from 'lucide-react';

interface SignalsTableProps {
  signals: EngulfingSignal[];
}

interface ParsedNotes {
  grade?: string;
  action_str?: string;
  total_score?: number;
  ticket_id?: number | string;
  score_breakdown?: string;
}

export function SignalsTable({ signals }: SignalsTableProps) {
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(signals.map((s) => s.symbol));
    return Array.from(symbols);
  }, [signals]);

  const parsedSignals = useMemo(() => {
    return signals.map(sig => {
      let notesData: ParsedNotes = {};
      try {
        if (sig.notes) {
          notesData = JSON.parse(sig.notes);
        }
      } catch (e) {}
      
      const isBullish = sig.pattern_type === 'bullish_engulfing';
      const direction = isBullish ? 'BUY' : 'SELL';
      const grade = notesData.grade || sig.trading_session ? (notesData.grade || '-') : '-';
      const score = notesData.total_score ?? null;
      const ticketId = notesData.ticket_id || null;

      // Handle fallback if grade in database is N/A or if notes parsing fails but it has trading_session
      const displayGrade = sig.trading_session && grade === '-' ? 'N/A' : grade;

      return {
        ...sig,
        direction,
        grade: displayGrade,
        score,
        ticketId,
        scoreBreakdown: notesData.score_breakdown || ''
      };
    });
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return parsedSignals.filter((sig) => {
      const matchSymbol = filterSymbol === 'ALL' || sig.symbol === filterSymbol;
      const matchDirection = filterDirection === 'ALL' || sig.direction === filterDirection;
      const matchGrade = filterGrade === 'ALL' || sig.grade === filterGrade;
      const matchSession = filterSession === 'ALL' || (sig.trading_session && sig.trading_session.toLowerCase().includes(filterSession.toLowerCase()));
      
      let matchStrategy = true;
      if (filterStrategy === 'FILTER_A') {
        matchStrategy = sig.grade !== 'N/A';
      } else if (filterStrategy === 'FILTER_B') {
        matchStrategy = sig.grade === 'N/A';
      }

      let matchStatus = true;
      if (filterStatus === 'CONFIRMED') {
        matchStatus = sig.is_confirmed;
      } else if (filterStatus === 'SKIPPED') {
        matchStatus = !sig.is_confirmed;
      }

      return matchSymbol && matchDirection && matchGrade && matchStatus && matchSession && matchStrategy;
    });
  }, [parsedSignals, filterSymbol, filterDirection, filterGrade, filterStatus, filterSession, filterStrategy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSymbol, filterDirection, filterGrade, filterStatus, filterSession, filterStrategy, signals]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
  const paginatedSignals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSignals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSignals, currentPage]);

  return (
    <div className="space-y-4">
      {/* Filters Container */}
      <div className="bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted mr-2">
            <Filter size={18} />
            <span className="text-sm font-medium">Filter Sinyal</span>
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Status</option>
            <option value="CONFIRMED">Dikonfirmasi (OP)</option>
            <option value="SKIPPED">Dilewati (Skip)</option>
          </select>

          {/* Filter Direction */}
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Arah</option>
            <option value="BUY">BUY (Bullish)</option>
            <option value="SELL">SELL (Bearish)</option>
          </select>

          {/* Filter Symbol */}
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Symbol</option>
            {uniqueSymbols.map((sym) => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>

          {/* Filter Session */}
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Sesi</option>
            <option value="Asia">Sesi Asia</option>
            <option value="Euro">Sesi Eropa (London)</option>
            <option value="NY">Sesi Amerika (New York)</option>
          </select>

          {/* Filter Strategy */}
          <select
            value={filterStrategy}
            onChange={(e) => setFilterStrategy(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Strategi</option>
            <option value="FILTER_A">Filter A (Scoring & Grade)</option>
            <option value="FILTER_B">Filter B (Pullback Limit)</option>
          </select>

          {/* Filter Grade */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Grade</option>
            <option value="A+">Grade A+</option>
            <option value="A">Grade A</option>
            <option value="B+">Grade B+</option>
            <option value="B">Grade B</option>
            <option value="C+">Grade C+</option>
            <option value="C">Grade C</option>
            <option value="D">Grade D</option>
            <option value="N/A">Grade N/A (Strategy B)</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
            <thead>
              <tr className="bg-slate-800/50 text-muted border-b border-slate-700/50">
                <th className="px-6 py-4 font-medium text-sm">Waktu</th>
                <th className="px-6 py-4 font-medium text-sm">Symbol (TF)</th>
                <th className="px-6 py-4 font-medium text-sm">Arah</th>
                <th className="px-6 py-4 font-medium text-sm">Sesi</th>
                <th className="px-6 py-4 font-medium text-sm">Strategi</th>
                <th className="px-6 py-4 font-medium text-sm">Grade & Score</th>
                <th className="px-6 py-4 font-medium text-sm">Status</th>
                <th className="px-6 py-4 font-medium text-sm">Detail / Alasan Skip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedSignals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted">
                    Tidak ada riwayat trigger yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedSignals.map((sig) => (
                  <tr
                    key={sig.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Waktu */}
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                      {format(new Date(sig.signal_time), 'dd MMM yyyy HH:mm')}
                    </td>
                    
                    {/* Symbol (TF) */}
                    <td className="px-6 py-4 text-sm font-semibold text-text">
                      {sig.symbol} <span className="text-muted text-xs font-normal">({sig.timeframe})</span>
                    </td>

                    {/* Arah */}
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                          sig.direction === 'BUY'
                            ? 'bg-success/20 text-success'
                            : 'bg-danger/20 text-danger'
                        )}
                      >
                        {sig.direction === 'BUY' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {sig.direction}
                      </span>
                    </td>

                    {/* Sesi */}
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700 text-xs font-mono text-slate-300">
                        <Globe size={11} className="text-primary" />
                        {sig.trading_session || 'Unknown'}
                      </span>
                    </td>

                    {/* Strategi */}
                    <td className="px-6 py-4 text-sm">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border",
                        sig.grade === 'N/A' 
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/20" 
                          : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      )}>
                        <Shield size={11} className={sig.grade === 'N/A' ? "text-purple-300" : "text-blue-300"} />
                        {sig.grade === 'N/A' ? 'Filter B' : 'Filter A'}
                      </span>
                    </td>

                    {/* Grade & Score */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          sig.grade.startsWith('A') ? "bg-success/20 text-success" :
                          sig.grade.startsWith('B') ? "bg-primary/20 text-primary" :
                          sig.grade.startsWith('C') ? "bg-amber-400/20 text-amber-400" :
                          sig.grade === '-' ? "bg-slate-700 text-slate-300" :
                          sig.grade === 'N/A' ? "bg-purple-500/20 text-purple-300" :
                          "bg-danger/20 text-danger"
                        )}>{sig.grade}</span>
                        {sig.score !== null && sig.grade !== 'N/A' && (
                          <span className="text-[10px] text-muted font-mono">
                            Confidence: {sig.score.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-sm">
                      {sig.is_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-success font-medium bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                          <CheckCircle size={14} />
                          OP Dikonfirmasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-danger font-medium bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          <AlertTriangle size={14} />
                          Dilewati (Skip)
                        </span>
                      )}
                    </td>

                    {/* Detail / Alasan Skip */}
                    <td className="px-6 py-4 text-sm">
                      {sig.is_confirmed ? (
                        <span className="text-slate-400 font-mono">
                          {sig.ticketId ? `Ticket ID: #${sig.ticketId}` : 'Executed in Market'}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-danger font-medium">
                            ⚠️ {sig.skip_reason || 'Tidak memenuhi kriteria filter'}
                          </span>
                          {sig.scoreBreakdown && (
                            <span className="text-[10px] text-muted font-mono tracking-tight">
                              Score: {sig.scoreBreakdown}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
          <p className="text-sm text-muted">
            Menampilkan <span className="font-medium text-text">{(currentPage - 1) * itemsPerPage + 1}</span> sampai{' '}
            <span className="font-medium text-text">
              {Math.min(currentPage * itemsPerPage, filteredSignals.length)}
            </span>{' '}
            dari <span className="font-medium text-text">{filteredSignals.length}</span> hasil
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-slate-300 font-medium px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
