import { useState, useMemo, useEffect } from 'react';
import type { TradeAnalytics } from '../types';
import { format } from 'date-fns';
import { cn, getSessionGroup, getSummerFlag } from '../lib/utils';
import { Filter, Image as ImageIcon, X, Clock, TrendingUp, TrendingDown, BarChart2, Trash2, AlertTriangle, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DateRangePicker } from './ui/DateRangePicker';
import { useLanguage } from '../lib/i18n';

interface TradesTableProps {
  trades: TradeAnalytics[];
  onImageClick: (url: string) => void;
  dstMode: 'auto' | 'summer' | 'winter';
}

export function TradesTable({ trades, onImageClick, dstMode }: TradesTableProps) {
  const { t } = useLanguage();
  const isSummer = getSummerFlag(dstMode);
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterResult, setFilterResult] = useState<string>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterTicket, setFilterTicket] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterTimeFrom, setFilterTimeFrom] = useState<string>('');
  const [filterTimeTo, setFilterTimeTo] = useState<string>('');

  const [tradeToDelete, setTradeToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(trades.map((t) => t.symbol));
    return Array.from(symbols);
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchMode = filterMode === 'ALL' || trade.mode === filterMode;
      const matchResult = filterResult === 'ALL' || trade.result === filterResult;
      const matchSymbol = filterSymbol === 'ALL' || trade.symbol === filterSymbol;
      const matchSession = filterSession === 'ALL' || getSessionGroup(trade, dstMode) === filterSession;

      let tradeGrade = '-';
      try {
        if (trade.notes) {
          const n = JSON.parse(trade.notes);
          tradeGrade = n.grade || '-';
        }
      } catch (e) { }

      const matchGrade = filterGrade === 'ALL' || tradeGrade === filterGrade;

      const matchDate = () => {
        if (!dateFrom && !dateTo) return true;
        const entryDate = trade.trade_created_at.split('T')[0];
        if (dateFrom && dateTo) return entryDate >= dateFrom && entryDate <= dateTo;
        if (dateFrom) return entryDate >= dateFrom;
        if (dateTo) return entryDate <= dateTo;
        return true;
      };

      let matchTicket = true;
      if (filterTicket.trim() !== '') {
        matchTicket = trade.ticket_id.toString().includes(filterTicket.trim());
      }

      let matchTime = true;
      if ((dateFrom || dateTo) && (filterTimeFrom || filterTimeTo)) {
        const tradeHHmm = format(new Date(trade.trade_created_at), 'HH:mm');
        if (filterTimeFrom && tradeHHmm < filterTimeFrom) matchTime = false;
        if (filterTimeTo && tradeHHmm > filterTimeTo) matchTime = false;
      }

      return matchMode && matchResult && matchSymbol && matchGrade && matchDate() && matchTime && matchSession && matchTicket;
    });
  }, [trades, filterMode, filterResult, filterSymbol, filterGrade, filterSession, dateFrom, dateTo, filterTimeFrom, filterTimeTo, filterTicket, dstMode]);

  // Cek apakah ada filter aktif
  const isAnyFilterActive =
    filterMode !== 'ALL' ||
    filterResult !== 'ALL' ||
    filterSymbol !== 'ALL' ||
    filterGrade !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterTicket !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    filterTimeFrom !== '' ||
    filterTimeTo !== '';

  // Kalkulasi ringkasan dari hasil filter
  const filterSummaryStats = useMemo(() => {
    const total = filteredTrades.length;
    const profitCount = filteredTrades.filter((t) => t.result === 'PROFIT').length;
    const lossCount = filteredTrades.filter((t) => t.result === 'LOSS').length;
    const winRate = total > 0 ? (profitCount / total) * 100 : 0;
    const netProfit = filteredTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0);
    const totalProfitSum = filteredTrades
      .filter((t) => t.result === 'PROFIT')
      .reduce((sum, t) => sum + (t.profit ?? 0), 0);
    const totalLossSum = filteredTrades
      .filter((t) => t.result === 'LOSS')
      .reduce((sum, t) => sum + (t.profit ?? 0), 0);
    return { total, profitCount, lossCount, winRate, netProfit, totalProfitSum, totalLossSum };
  }, [filteredTrades]);

  // Label deskripsi filter aktif
  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filterMode !== 'ALL') parts.push(filterMode);
    if (filterResult !== 'ALL') parts.push(filterResult);
    if (filterSymbol !== 'ALL') parts.push(filterSymbol);
    if (filterTicket) parts.push(`Ticket ${filterTicket}`);
    if (filterGrade !== 'ALL') parts.push(`Grade ${filterGrade}`);
    if (filterSession !== 'ALL') parts.push(`Sesi ${filterSession}`);
    if (dateFrom || dateTo) {
      let datePart = '';
      if (dateFrom && dateTo && dateFrom !== dateTo) {
        datePart = `${dateFrom} - ${dateTo}`;
      } else if (dateFrom || dateTo) {
        datePart = dateFrom || dateTo;
      }
      if (filterTimeFrom || filterTimeTo) {
        let timePart = '';
        if (filterTimeFrom && filterTimeTo) timePart = `${filterTimeFrom}-${filterTimeTo}`;
        else if (filterTimeFrom) timePart = `>=${filterTimeFrom}`;
        else if (filterTimeTo) timePart = `<=${filterTimeTo}`;
        parts.push(`Waktu: ${datePart} (${timePart})`);
      } else {
        parts.push(`Tanggal: ${datePart}`);
      }
    }
    return parts.join(' · ');
  }, [filterMode, filterResult, filterSymbol, filterGrade, filterSession, dateFrom, dateTo, filterTimeFrom, filterTimeTo, filterTicket]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, filterResult, filterSymbol, filterGrade, filterSession, dateFrom, dateTo, filterTimeFrom, filterTimeTo, filterTicket, trades]);

  // Clear jam filter
  const clearTimeFilter = () => {
    setFilterTimeFrom('');
    setFilterTimeTo('');
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrades, currentPage]);

  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;
    setIsDeleting(true);
    try {
      const r1 = await supabase.from('wa_outbox').delete().eq('ticket_id', tradeToDelete);
      if (r1.error) throw new Error(`wa_outbox: ${r1.error.message}`);

      const r2 = await supabase.from('trade_active_logs').delete().eq('ticket_id', tradeToDelete);
      if (r2.error) throw new Error(`trade_active_logs: ${r2.error.message}`);

      const r3 = await supabase.from('trade_analytics').delete().eq('ticket_id', tradeToDelete);
      if (r3.error) throw new Error(`trade_analytics: ${r3.error.message}`);

      const r4 = await supabase.from('engulfing_signals').delete().eq('ticket_id', tradeToDelete);
      if (r4.error) throw new Error(`engulfing_signals: ${r4.error.message}`);

      // Tampilkan notifikasi sukses
      setSuccessToast(`Tiket #${tradeToDelete} berhasil dihapus secara permanen dari semua tabel analisa.`);
      setTimeout(() => setSuccessToast(null), 5000);

    } catch (error: any) {
      console.error("Gagal menghapus tiket:", error);
      alert("Gagal menghapus data! Pesan error: " + error.message);
    } finally {
      setIsDeleting(false);
      setTradeToDelete(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Filter Container ── */}
      <div className="bg-card p-4 rounded-xl border border-slate-700/50 shadow-md space-y-3">
        {/* Row 1: Semua filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted mr-2">
            <Filter size={18} />
            <span className="text-sm font-medium">{t('filters')}</span>
          </div>

          {/* Filter Mode */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">{t('allModes')}</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>

          {/* Filter Result */}
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">{t('allResults')}</option>
            <option value="PROFIT">PROFIT</option>
            <option value="LOSS">LOSS</option>
          </select>

          {/* Filter Symbol */}
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Simbol</option>
            {uniqueSymbols.map((sym) => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>

          {/* Filter Ticket */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Cari Ticket ID..."
              value={filterTicket}
              onChange={(e) => setFilterTicket(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary placeholder:text-slate-500 w-36"
            />
            {filterTicket && (
              <button
                onClick={() => setFilterTicket('')}
                className="absolute right-2 text-slate-400 hover:text-white transition-colors"
                title="Clear Ticket"
              >
                <X size={13} />
              </button>
            )}
          </div>

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
              <span className="text-xs text-muted shrink-0">{t('timeFrom')}</span>
              <input
                type="time"
                value={filterTimeFrom}
                onChange={(e) => setFilterTimeFrom(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark] w-28"
                title={t('timeFrom')}
              />
              <span className="text-muted text-xs">–</span>
              <span className="text-xs text-muted shrink-0">{t('timeTo')}</span>
              <input
                type="time"
                value={filterTimeTo}
                onChange={(e) => setFilterTimeTo(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark] w-28"
                title={t('timeTo')}
              />
              {(filterTimeFrom || filterTimeTo) && (
                <button
                  onClick={clearTimeFilter}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                  title={t('clearTime')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel Kalkulasi Ringkasan Filter ── */}
      {isAnyFilterActive && (
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border border-slate-700/60 shadow-lg',
            'bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-slate-800/90',
            'border-l-4 border-l-primary'
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-primary" />
                <span className="text-sm font-semibold text-slate-200">{t('filterSummary')}</span>
                {activeFilterLabel && (
                  <span className="text-xs text-muted bg-slate-700/60 px-2 py-0.5 rounded-full border border-slate-600/50">
                    {activeFilterLabel}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">
                {filterSummaryStats.total} {t('trades')}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Trades */}
              <div className="bg-slate-700/40 rounded-lg px-3 py-2.5 border border-slate-600/30">
                <p className="text-[10px] text-muted uppercase tracking-wide mb-1">{t('totalTradesLabel')}</p>
                <p className="text-lg font-bold text-slate-100 leading-none">{filterSummaryStats.total}</p>
              </div>

              {/* Profit Count */}
              <div className="bg-green-500/10 rounded-lg px-3 py-2.5 border border-green-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={10} className="text-success" />
                  <p className="text-[10px] text-success uppercase tracking-wide">{t('profitLabel')} (Trades)</p>
                </div>
                <p className="text-lg font-bold text-success leading-none">{filterSummaryStats.profitCount}</p>
              </div>

              {/* Loss Count */}
              <div className="bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown size={10} className="text-danger" />
                  <p className="text-[10px] text-danger uppercase tracking-wide">{t('lossLabel')} (Trades)</p>
                </div>
                <p className="text-lg font-bold text-danger leading-none">{filterSummaryStats.lossCount}</p>
              </div>

              {/* Win Rate */}
              <div className="bg-slate-700/40 rounded-lg px-3 py-2.5 border border-slate-600/30">
                <p className="text-[10px] text-muted uppercase tracking-wide mb-1">{t('winRateLabel')}</p>
                <p
                  className={cn(
                    'text-lg font-bold leading-none',
                    filterSummaryStats.winRate >= 50 ? 'text-success' : 'text-danger'
                  )}
                >
                  {filterSummaryStats.total > 0
                    ? `${filterSummaryStats.winRate.toFixed(1)}%`
                    : '-%'}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-700/50" />

            {/* Stats Grid — Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Profit */}
              <div className="bg-green-500/10 rounded-lg px-4 py-3 border border-green-500/20">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingUp size={11} className="text-success" />
                  <p className="text-[10px] text-success uppercase tracking-wide font-semibold">Total Profit</p>
                </div>
                <p className="text-xl font-bold font-mono text-success leading-none">
                  +{filterSummaryStats.totalProfitSum.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted mt-1">{filterSummaryStats.profitCount} trade menang</p>
              </div>

              {/* Total Loss */}
              <div className="bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingDown size={11} className="text-danger" />
                  <p className="text-[10px] text-danger uppercase tracking-wide font-semibold">Total Loss</p>
                </div>
                <p className="text-xl font-bold font-mono text-danger leading-none">
                  {filterSummaryStats.totalLossSum.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted mt-1">{filterSummaryStats.lossCount} trade kalah</p>
              </div>

              {/* Total Bersih */}
              <div
                className={cn(
                  'rounded-lg px-4 py-3 border',
                  filterSummaryStats.netProfit >= 0
                    ? 'bg-gradient-to-br from-green-500/15 to-green-500/5 border-green-500/30'
                    : 'bg-gradient-to-br from-red-500/15 to-red-500/5 border-red-500/30'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BarChart2 size={11} className={filterSummaryStats.netProfit >= 0 ? 'text-success' : 'text-danger'} />
                  <p className={cn('text-[10px] uppercase tracking-wide font-semibold', filterSummaryStats.netProfit >= 0 ? 'text-success' : 'text-danger')}>
                    Total Bersih
                  </p>
                </div>
                <p
                  className={cn(
                    'text-xl font-bold font-mono leading-none',
                    filterSummaryStats.netProfit >= 0 ? 'text-success' : 'text-danger'
                  )}
                >
                  {filterSummaryStats.netProfit >= 0 ? '+' : ''}
                  {filterSummaryStats.netProfit.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted mt-1">
                  dari {filterSummaryStats.total} total trade
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px] md:min-w-full">
            <thead>
              <tr className="bg-slate-800/50 text-muted border-b border-slate-700/50">
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('time')}</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Ticket ID</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('symbol')}</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('mode')}</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Sesi</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('result')}</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">{t('profit')}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium text-sm">{t('entryExit')}</th>
                <th className="hidden md:table-cell px-6 py-4 font-medium text-sm">Grade & Score</th>
                <th className="hidden lg:table-cell px-6 py-4 font-medium text-sm">Triggers (H1|M15|M5)</th>
                <th className="hidden lg:table-cell px-6 py-4 font-medium text-sm">OP Level & MFE</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-muted">
                    {t('noTrades')}
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((trade) => (
                  <tr
                    key={trade.trade_id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-300">
                      <div className="md:hidden">{format(new Date(trade.trade_created_at), 'dd MMM')}</div>
                      <div className="md:hidden text-muted text-[10px]">{format(new Date(trade.trade_created_at), 'HH:mm')}</div>
                      <span className="hidden md:inline">{format(new Date(trade.trade_created_at), 'dd MMM yyyy HH:mm')}</span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-mono text-slate-400">
                      #{trade.ticket_id}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold text-text">
                      {trade.symbol} <span className="text-muted text-[10px] md:text-xs font-normal block md:inline">({trade.timeframe})</span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                      <span
                        className={cn(
                          'px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium',
                          trade.mode === 'BUY'
                            ? 'bg-success/20 text-success'
                            : 'bg-danger/20 text-danger'
                        )}
                      >
                        {trade.mode}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-300">
                      <span className="inline-flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700 text-xs font-mono text-slate-300">
                        <Globe size={11} className="text-primary" />
                        {trade.trading_session || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                      <span
                        className={cn(
                          'font-medium text-[10px] md:text-sm',
                          trade.result === 'PROFIT' ? 'text-success' : 'text-danger'
                        )}
                      >
                        {trade.result}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-mono">
                      <span
                        className={cn(
                          trade.profit && trade.profit > 0 ? 'text-success' : 'text-danger'
                        )}
                      >
                        {trade.profit && trade.profit > 0 ? '+' : ''}
                        {trade.profit?.toFixed(2)}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-xs text-muted">
                      <div>Entry: {trade.op_price}</div>
                      <div>Exit: {trade.result === 'PROFIT' ? trade.tp_price : trade.sl_price}</div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      {(() => {
                        try {
                          const n = trade.notes ? JSON.parse(trade.notes) : {};
                          const g = n.grade || '-';
                          const sb = n.score_breakdown || '';
                          const ring = n.ring_pts ? `Ring: ${n.ring_pts} pts` : '';
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-bold",
                                g.startsWith('A') ? "bg-success/20 text-success" :
                                  g.startsWith('B') ? "bg-primary/20 text-primary" :
                                    g.startsWith('C') ? "bg-amber-400/20 text-amber-400" :
                                      g === '-' ? "bg-slate-700 text-slate-300" :
                                        g === 'N/A' ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30" :
                                          "bg-danger/20 text-danger"
                              )}>{g}</span>
                              {sb && <span className="text-[9px] text-muted font-mono tracking-tight whitespace-nowrap">{sb}</span>}
                              {ring && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-sm whitespace-nowrap border border-slate-700">{ring}</span>}
                            </div>
                          );
                        } catch (e) {
                          return <span className="text-xs text-muted">-</span>;
                        }
                      })()}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-xs">
                      {(() => {
                        try {
                          const n = trade.notes ? JSON.parse(trade.notes) : {};
                          const h1 = n.h1_trigger_source || '-';
                          const m15 = n.m15_trigger_source || '-';
                          const m5 = n.m5_trigger_source || '-';
                          if (h1 === '-' && m15 === '-' && m5 === '-') return <span className="text-muted">-</span>;
                          return (
                            <div className="flex flex-col gap-1 font-mono text-[10px]">
                              <span className="text-purple-400">H1: {h1}</span>
                              <span className="text-blue-400">M15: {m15}</span>
                              <span className="text-emerald-400">M5: {m5}</span>
                            </div>
                          );
                        } catch (e) { return <span className="text-muted">-</span>; }
                      })()}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-xs">
                      {(() => {
                        try {
                          const n = trade.notes ? JSON.parse(trade.notes) : {};
                          const opPts = n.op_level_pts !== undefined ? n.op_level_pts : '-';
                          const opPct = n.op_level_pct !== undefined ? n.op_level_pct : '-';
                          const fUsd = n.max_floating_usd !== undefined ? Math.abs(n.max_floating_usd).toFixed(2) : '-';
                          const fPts = n.max_floating_pts !== undefined ? Math.abs(n.max_floating_pts).toFixed(1) : '-';
                          const fPct = n.max_loss_to_sl_pct !== undefined ? Math.abs(n.max_loss_to_sl_pct).toFixed(1) : '-';
                          return (
                            <div className="flex flex-col gap-1 whitespace-nowrap">
                              <span className="text-[10px] text-slate-300 bg-slate-800/50 px-1.5 py-0.5 rounded-sm border border-slate-700">OP: {opPts} pts ({opPct}%)</span>
                              <span className="text-[10px] text-danger font-medium bg-danger/10 px-1.5 py-0.5 rounded-sm border border-danger/20">MFE: -${fUsd} ({fPts} pts | {fPct}%)</span>
                            </div>
                          );
                        } catch (e) { return <span className="text-muted">-</span>; }
                      })()}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {trade.image_url && (
                          <button
                            onClick={() => onImageClick(trade.image_url)}
                            className="text-primary hover:text-primary/80 transition-colors inline-flex items-center justify-center p-1.5 md:p-2 rounded-lg hover:bg-primary/10"
                            title="View Screenshot"
                          >
                            <ImageIcon size={16} className="md:w-[18px] md:h-[18px]" />
                          </button>
                        )}
                        <button
                          onClick={() => setTradeToDelete(trade.ticket_id)}
                          className="text-danger hover:text-danger/80 transition-colors inline-flex items-center justify-center p-1.5 md:p-2 rounded-lg hover:bg-danger/10"
                          title="Hapus Data Trade"
                        >
                          <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
          <p className="text-sm text-muted">
            {t('showing')} <span className="font-medium text-text">{(currentPage - 1) * itemsPerPage + 1}</span> {t('to')}{' '}
            <span className="font-medium text-text">
              {Math.min(currentPage * itemsPerPage, filteredTrades.length)}
            </span>{' '}
            {t('of')} <span className="font-medium text-text">{filteredTrades.length}</span> {t('results')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('previous')}
            </button>
            <span className="text-sm text-slate-300 font-medium px-2">
              {t('page')} {currentPage} {t('of')} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {tradeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 mb-4 mx-auto">
              <AlertTriangle size={24} className="text-danger" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 text-center mb-2">Hapus Riwayat Trading?</h3>
            <p className="text-sm text-slate-300 text-center mb-6">
              Apakah Anda yakin ingin menghapus tiket <span className="font-mono text-danger font-bold">#{tradeToDelete}</span>? Menghapus tiket ini akan menghapus riwayat dari tabel analisis, log aktif, antrean pesan, dan sinyal. <br /><br />Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setTradeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteTrade}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Toast Notification ── */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 border border-success/30 text-success px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="bg-success/20 p-1.5 rounded-full">
              <TrendingUp size={16} className="text-success" />
            </div>
            <span className="text-sm font-medium">{successToast}</span>
            <button onClick={() => setSuccessToast(null)} className="text-success/70 hover:text-success transition-colors ml-4 p-1 rounded hover:bg-success/10">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
