import { useState, useMemo, useEffect } from 'react';
import type { EngulfingSignal } from '../types';
import { format } from 'date-fns';
import { cn, getSessionGroup, getSummerFlag } from '../lib/utils';
import { Filter, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Globe, Shield, Clock, X } from 'lucide-react';
import { DateRangePicker } from './ui/DateRangePicker';

interface SignalsTableProps {
  signals: EngulfingSignal[];
  dstMode: 'auto' | 'summer' | 'winter';
}

interface ParsedNotes {
  grade?: string;
  action_str?: string;
  total_score?: number;
  ticket_id?: number | string;
  score_breakdown?: string;
  trading_session?: string;
  h1_trigger_source?: string;
  m15_trigger_source?: string;
  m5_trigger_source?: string;
  ema_distance_pts?: number;
  ema_distance_status?: string;
  h1_ema_distance_pts?: number;
  h1_ema_distance_status?: string;
}

export function SignalsTable({ signals, dstMode }: SignalsTableProps) {
  const isSummer = getSummerFlag(dstMode);
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterTimeFrom, setFilterTimeFrom] = useState<string>('');
  const [filterTimeTo, setFilterTimeTo] = useState<string>('');
  
  const clearTimeFilter = () => {
    setFilterTimeFrom('');
    setFilterTimeTo('');
  };
  
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
      const grade = notesData.grade || (sig.trading_session ? notesData.grade : '-') || '-';
      const score = notesData.total_score ?? null;
      const ticketId = notesData.ticket_id || null;
      
      const isInfoRow = typeof ticketId === 'string' && (ticketId === 'TFM_STATUS_CHANGE' || ticketId === 'INFO_SYNC' || ticketId.startsWith('INFO_'));
      const sessionRaw = sig.trading_session || notesData.trading_session || '';
      const session = isInfoRow ? '—' : (sessionRaw || 'Unknown');
      
      let emaDistancePts = notesData.ema_distance_pts ?? notesData.h1_ema_distance_pts ?? null;
      let emaDistanceStatus = notesData.ema_distance_status ?? notesData.h1_ema_distance_status ?? null;

      if (emaDistancePts == null && sig.curr_open && sig.ema_slow_value && sig.curr_open > 0 && sig.ema_slow_value > 0) {
        const sym = sig.symbol.toUpperCase();
        let pt = 0.01;
        if (sym.includes('NASDAQ') || sym.includes('US100') || sym.includes('USTEC') || sym.includes('BTC')) {
          pt = 1.0;
        }
        const distRaw = Math.abs(sig.curr_open - sig.ema_slow_value);
        emaDistancePts = Math.round(distRaw / pt);

        let minPts = 250, maxPts = 1000;
        if (sym.includes('NASDAQ') || sym.includes('US100') || sym.includes('USTEC')) {
          minPts = 2100; maxPts = 7500;
        } else if (sym.includes('BTC')) {
          minPts = 12500; maxPts = 37000;
        }

        if (emaDistancePts < minPts) emaDistanceStatus = 'INVALID';
        else if (emaDistancePts > maxPts) emaDistanceStatus = 'VALID';
        else emaDistanceStatus = 'STRONG';
      }
      const h1Trigger = notesData.h1_trigger_source || '-';
      const m15Trigger = notesData.m15_trigger_source || '-';
      const m5Trigger = notesData.m5_trigger_source || '-';

      // Handle fallback if grade in database is N/A or if notes parsing fails but it has trading_session
      const displayGrade = (sig.trading_session || notesData.trading_session) && grade === '-' ? 'N/A' : grade;

      return {
        ...sig,
        direction,
        grade: displayGrade,
        score,
        ticketId,
        displaySession: session,
        emaDistancePts,
        emaDistanceStatus,
        h1Trigger,
        m15Trigger,
        m5Trigger,
        scoreBreakdown: notesData.score_breakdown || ''
      };
    });
  }, [signals]);

  const filteredSignals = useMemo(() => {
    return parsedSignals.filter((sig) => {
      const matchSymbol = filterSymbol === 'ALL' || sig.symbol === filterSymbol;
      const matchDirection = filterDirection === 'ALL' || sig.direction === filterDirection;
      const matchGrade = filterGrade === 'ALL' || sig.grade === filterGrade;
      const matchSession = filterSession === 'ALL' || getSessionGroup(sig, dstMode) === filterSession;
      
      const matchDate = () => {
        if (!dateFrom && !dateTo) return true;
        const sigDate = sig.signal_time.split('T')[0];
        if (dateFrom && dateTo) return sigDate >= dateFrom && sigDate <= dateTo;
        if (dateFrom) return sigDate >= dateFrom;
        if (dateTo) return sigDate <= dateTo;
        return true;
      };

      let matchStrategy = true;
      if (filterStrategy === 'FILTER_A') {
        matchStrategy = sig.grade !== 'N/A';
      } else if (filterStrategy === 'FILTER_B') {
        matchStrategy = sig.grade === 'N/A';
      }

      const isInfo = typeof sig.ticketId === 'string' && sig.ticketId.startsWith('INFO_');

      let matchStatus = true;
      if (filterStatus === 'CONFIRMED') {
        matchStatus = sig.is_confirmed && !isInfo;
      } else if (filterStatus === 'SKIPPED') {
        matchStatus = !sig.is_confirmed && !isInfo;
      } else if (filterStatus === 'INFO') {
        matchStatus = isInfo;
      }

      let matchTime = true;
      if ((dateFrom || dateTo) && (filterTimeFrom || filterTimeTo)) {
        const sigHHmm = format(new Date(sig.signal_time), 'HH:mm');
        if (filterTimeFrom && sigHHmm < filterTimeFrom) matchTime = false;
        if (filterTimeTo && sigHHmm > filterTimeTo) matchTime = false;
      }

      return matchSymbol && matchDirection && matchGrade && matchStatus && matchSession && matchStrategy && matchDate() && matchTime;
    });
  }, [parsedSignals, filterSymbol, filterDirection, filterGrade, filterStatus, filterSession, filterStrategy, dateFrom, dateTo, filterTimeFrom, filterTimeTo, dstMode]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSymbol, filterDirection, filterGrade, filterStatus, filterSession, filterStrategy, dateFrom, dateTo, filterTimeFrom, filterTimeTo, signals]);

  const stats = useMemo(() => {
    // Only count genuine OP signals for total, confirmed, skipped
    const opSignals = filteredSignals.filter(s => !(typeof s.ticketId === 'string' && s.ticketId.startsWith('INFO_')));
    const infoSignals = filteredSignals.filter(s => typeof s.ticketId === 'string' && s.ticketId.startsWith('INFO_'));
    
    const totalOP = opSignals.length;
    const totalInfo = infoSignals.length;
    const confirmed = opSignals.filter(s => s.is_confirmed).length;
    const skipped = totalOP - confirmed;
    
    const confirmRate = totalOP > 0 ? (confirmed / totalOP) * 100 : 0;
    const skipRate = totalOP > 0 ? (skipped / totalOP) * 100 : 0;
    
    // Calculate skip reasons count
    const skipReasonsMap: Record<string, number> = {};
    opSignals.forEach(s => {
      if (!s.is_confirmed && s.skip_reason) {
        let reason = s.skip_reason;
        if (reason.includes('posisi aktif') || reason.includes('active position')) {
          reason = 'Ada Posisi Aktif';
        } else if (reason.includes('Grade') || reason.includes('grade')) {
          reason = 'Grade Di Bawah Batas';
        } else if (reason.includes('Pattern size') || reason.includes('pattern size')) {
          reason = 'Ukuran Candle Tidak Sesuai';
        }
        skipReasonsMap[reason] = (skipReasonsMap[reason] || 0) + 1;
      }
    });
    
    const skipReasonsList = Object.entries(skipReasonsMap)
      .map(([reason, count]) => ({ reason, count, pct: skipped > 0 ? (count / skipped) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
      
    return { total: totalOP, totalInfo, confirmed, skipped, confirmRate, skipRate, skipReasonsList };
  }, [filteredSignals]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
  const paginatedSignals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSignals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSignals, currentPage]);

  return (
    <div className="space-y-4">
      {/* Summary Analytics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total OP Trigger */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total OP Trigger</span>
            <span className="text-2xl font-black text-white mt-1 block">{stats.total}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Sinyal eksekusi (non-info) yang dideteksi scanner</p>
        </div>

        {/* Info & Sync Signals */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">Info & Sync Signals</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">{stats.totalInfo}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Sinyal pasif untuk M15, H1, dan Sinkronisasi</p>
        </div>

        {/* OP Dikonfirmasi */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider block">Confirmed (OP)</span>
              <span className="text-2xl font-black text-green-400 mt-1 block">{stats.confirmed}</span>
            </div>
            <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full font-bold">
              {stats.confirmRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Sinyal lolos filter dan dieksekusi di MT5</p>
        </div>

        {/* Dilewati / Skip */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider block">Skipped (Dilewati)</span>
              <span className="text-2xl font-black text-red-400 mt-1 block">{stats.skipped}</span>
            </div>
            <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">
              {stats.skipRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Sinyal disaring atau diabaikan oleh parameter filter</p>
        </div>

        {/* Top Skip Reasons */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Top Alasan Skip</span>
            {stats.skipReasonsList.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {stats.skipReasonsList.map((r, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[150px]" title={r.reason}>{r.reason}</span>
                    <span className="text-red-400 font-mono font-bold text-[11px] shrink-0">{r.count}x ({r.pct.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-3 italic">Tidak ada alasan skip terdeteksi.</p>
            )}
          </div>
        </div>
      </div>
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
            <option value="INFO">Hanya Info / Sync</option>
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
            <optgroup label="Sesi Utama (Aktif Only)">
              <option value="Asia Only">Asia Only {isSummer ? '(07:00 - 14:00)' : '(07:00 - 15:00)'}</option>
              <option value="Europe Only">Europe Only {isSummer ? '(16:00 - 19:00)' : '(16:00 - 20:00)'}</option>
              <option value="New York Only">New York Only {isSummer ? '(23:00 - 04:00)' : '(00:00 - 05:00)'}</option>
            </optgroup>
            <optgroup label="Sesi Overlap & Lainnya">
              <option value="Asia x Europe Overlap">Asia x Europe Overlap {isSummer ? '(14:00 - 16:00)' : '(15:00 - 16:00)'}</option>
              <option value="Europe x New York Overlap">Europe x New York Overlap {isSummer ? '(19:00 - 23:00)' : '(20:00 - 00:00)'}</option>
              <option value="Off / Low Liquidity">Off / Low Liquidity {isSummer ? '(04:00 - 07:00)' : '(05:00 - 07:00)'}</option>
            </optgroup>
          </select>

          {/* Date Picker Filter */}
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
              if (!f && !t) clearTimeFilter();
            }}
            className="bg-slate-800 border-slate-700 h-[34px]"
            placeholder="Select Date"
          />

          {/* Filter Jam */}
          {(dateFrom || dateTo) && (
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <Clock size={14} className="text-primary shrink-0" />
              <span className="text-xs text-muted shrink-0">Dari Jam</span>
              <input
                type="time"
                value={filterTimeFrom}
                onChange={(e) => setFilterTimeFrom(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark] w-28"
                title="Dari Jam"
              />
              <span className="text-muted text-xs">–</span>
              <span className="text-xs text-muted shrink-0">Sampai</span>
              <input
                type="time"
                value={filterTimeTo}
                onChange={(e) => setFilterTimeTo(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark] w-28"
                title="Sampai Jam"
              />
              {(filterTimeFrom || filterTimeTo) && (
                <button
                  onClick={clearTimeFilter}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                  title="Clear Time Filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

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
                <th className="px-6 py-4 font-medium text-sm">EMA Distance</th>
                <th className="hidden lg:table-cell px-6 py-4 font-medium text-sm">Triggers (H1|M15|M5)</th>
                <th className="px-6 py-4 font-medium text-sm">Status</th>
                <th className="px-6 py-4 font-medium text-sm">Detail / Alasan Skip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedSignals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted">
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
                        {sig.displaySession}
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

                    {/* EMA Distance */}
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {sig.emaDistancePts != null ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-mono text-xs text-slate-200 font-semibold">{sig.emaDistancePts.toLocaleString()} pts</span>
                          {sig.emaDistanceStatus && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded font-bold border",
                              sig.emaDistanceStatus === 'STRONG' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                              sig.emaDistanceStatus === 'VALID' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                              "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            )}>
                              {sig.emaDistanceStatus}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>

                    {/* Triggers */}
                    <td className="hidden lg:table-cell px-6 py-4">
                      {sig.h1Trigger === '-' && sig.m15Trigger === '-' && sig.m5Trigger === '-' ? (
                        <span className="text-muted text-xs">-</span>
                      ) : (
                        <div className="flex flex-col gap-1 font-mono text-[10px]">
                          <span className="text-purple-400">H1: {sig.h1Trigger}</span>
                          <span className="text-blue-400">M15: {sig.m15Trigger}</span>
                          <span className="text-emerald-400">M5: {sig.m5Trigger}</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-sm">
                      {typeof sig.ticketId === 'string' && sig.ticketId === 'TFM_STATUS_CHANGE' ? (
                        <span className="inline-flex items-center gap-1 text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          📡 Status Update
                        </span>
                      ) : typeof sig.ticketId === 'string' && sig.ticketId === 'INFO_SYNC' ? (
                        <span className="inline-flex items-center gap-1 text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                          🔥 Sync Signal
                        </span>
                      ) : typeof sig.ticketId === 'string' && sig.ticketId.startsWith('INFO_') ? (
                        <span className="inline-flex items-center gap-1 text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          ℹ️ Info Signal
                        </span>
                      ) : sig.is_confirmed ? (
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
                      {typeof sig.ticketId === 'string' && sig.ticketId === 'INFO_SYNC' ? (
                        <span className="text-orange-400/80 font-medium text-xs">
                          {(() => {
                            try {
                              const notes = JSON.parse(sig.notes || '{}');
                              return `Cocok Arah: ${sig.timeframe.replace('SYNC_', '').replace('_', ' & ')}` + (notes.sync_with ? ` (Based on ${notes.sync_with})` : '');
                            } catch {
                              return `Korelasi TF: ${sig.timeframe}`;
                            }
                          })()}
                        </span>
                      ) : typeof sig.ticketId === 'string' && sig.ticketId.startsWith('INFO_') ? (
                        <span className="text-blue-400/80 font-medium text-xs">
                          Sinyal pasif {sig.timeframe} (Hanya Notifikasi)
                        </span>
                      ) : sig.is_confirmed ? (
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
