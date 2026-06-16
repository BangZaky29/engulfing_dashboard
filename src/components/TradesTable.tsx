import { useState, useMemo, useEffect } from 'react';
import type { TradeAnalytics } from '../types';
import { format } from 'date-fns';
import { cn, getSessionGroup } from '../lib/utils';
import { ImageIcon, Filter, Clock, TrendingUp, TrendingDown, BarChart2, X, Globe } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface TradesTableProps {
  trades: TradeAnalytics[];
  onImageClick: (url: string) => void;
}

export function TradesTable({ trades, onImageClick }: TradesTableProps) {
  const { t } = useLanguage();
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterResult, setFilterResult] = useState<string>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTimeFrom, setFilterTimeFrom] = useState<string>('');
  const [filterTimeTo, setFilterTimeTo] = useState<string>('');

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
      const matchSession = filterSession === 'ALL' || getSessionGroup(trade) === filterSession;

      let tradeGrade = '-';
      try {
        if (trade.notes) {
          const n = JSON.parse(trade.notes);
          tradeGrade = n.grade || '-';
        }
      } catch (e) {}
      
      const matchGrade = filterGrade === 'ALL' || tradeGrade === filterGrade;

      let matchDate = true;
      if (filterDate) {
        const tradeDateStr = new Date(trade.trade_created_at).toISOString().split('T')[0];
        matchDate = tradeDateStr === filterDate;
      }

      // Filter jam hanya berlaku jika filter tanggal juga aktif
      let matchTime = true;
      if (filterDate && (filterTimeFrom || filterTimeTo)) {
        const tradeHHmm = format(new Date(trade.trade_created_at), 'HH:mm');
        if (filterTimeFrom && tradeHHmm < filterTimeFrom) matchTime = false;
        if (filterTimeTo && tradeHHmm > filterTimeTo) matchTime = false;
      }

      return matchMode && matchResult && matchSymbol && matchGrade && matchDate && matchTime && matchSession;
    });
  }, [trades, filterMode, filterResult, filterSymbol, filterGrade, filterSession, filterDate, filterTimeFrom, filterTimeTo]);

  // Cek apakah ada filter aktif
  const isAnyFilterActive =
    filterMode !== 'ALL' ||
    filterResult !== 'ALL' ||
    filterSymbol !== 'ALL' ||
    filterGrade !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterDate !== '' ||
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
    if (filterGrade !== 'ALL') parts.push(`Grade ${filterGrade}`);
    if (filterSession !== 'ALL') parts.push(`Sesi ${filterSession}`);
    if (filterDate) {
      let datePart = filterDate;
      if (filterTimeFrom || filterTimeTo) {
        datePart += ` | ${filterTimeFrom || '00:00'} – ${filterTimeTo || '23:59'}`;
      }
      parts.push(datePart);
    }
    return parts.join(' · ');
  }, [filterMode, filterResult, filterSymbol, filterGrade, filterSession, filterDate, filterTimeFrom, filterTimeTo]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, filterResult, filterSymbol, filterGrade, filterSession, filterDate, filterTimeFrom, filterTimeTo, trades]);

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
            <option value="ALL">{t('allSymbols')}</option>
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
            <optgroup label="Sesi Utama (Aktif)">
              <option value="Asia">Sesi Asia (07:00 - 14:00)</option>
              <option value="Euro">Sesi Eropa (16:00 - 19:00)</option>
              <option value="NY">Sesi New York (23:00 - 04:00)</option>
            </optgroup>
            <optgroup label="Sesi Overlap & Lainnya">
              <option value="Asia/Euro">Overlap Asia/Eropa (14:00 - 16:00)</option>
              <option value="Euro/NY">Overlap Eropa/NY (19:00 - 23:00)</option>
              <option value="Off-Market">Off-Market / Lainnya (04:00 - 07:00)</option>
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
          <div className="relative flex items-center">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (!e.target.value) {
                  clearTimeFilter();
                }
              }}
              className="bg-slate-800 border border-slate-700 text-sm rounded-lg pl-3 pr-8 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark]"
              title="Filter by Specific Date"
            />
            {filterDate && (
              <button
                onClick={() => {
                  setFilterDate('');
                  clearTimeFilter();
                }}
                className="absolute right-2 text-slate-400 hover:text-white transition-colors"
                title="Clear Date Filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Jam */}
          {filterDate && (
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
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm text-center">{t('chart')}</th>
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
                            </div>
                          );
                        } catch(e) {
                          return <span className="text-xs text-muted">-</span>;
                        }
                      })()}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-center">
                      {trade.image_url && (
                        <button
                          onClick={() => onImageClick(trade.image_url)}
                          className="text-primary hover:text-primary/80 transition-colors inline-flex items-center justify-center p-1.5 md:p-2 rounded-lg hover:bg-primary/10"
                          title="View Screenshot"
                        >
                          <ImageIcon size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                      )}
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
    </div>
  );
}
