import { useState, useMemo, useEffect } from 'react';
import type { TradeActiveLog } from '../types';
import { format } from 'date-fns';
import { cn, getSessionGroup, getSummerFlag } from '../lib/utils';
import { Filter, CheckCircle, ArrowUpRight, ArrowDownRight, Globe, Trash2, Clock, ImageIcon, X } from 'lucide-react';

interface ActiveLogsTableProps {
  logs: TradeActiveLog[];
  onImageClick: (url: string) => void;
  dstMode: 'auto' | 'summer' | 'winter';
}

export function ActiveLogsTable({ logs, onImageClick, dstMode }: ActiveLogsTableProps) {
  const isSummer = getSummerFlag(dstMode);
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
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
    const symbols = new Set(logs.map((l) => l.symbol));
    return Array.from(symbols);
  }, [logs]);

  const parsedLogs = useMemo(() => {
    return logs.map((log) => {
      const msg = log.message.toUpperCase();
      let status: 'FILED' | 'EXPIRED' | 'OVERRIDDEN' = 'FILED';
      let statusLabel = 'Tersentuh (Filled)';
      
      if (msg.includes('EXPIRED') || msg.includes('KADALUWARSA')) {
        status = 'EXPIRED';
        statusLabel = 'Expired (Batas Candle)';
      } else if (msg.includes('OVERRIDDEN') || msg.includes('DIBATALKAN')) {
        status = 'OVERRIDDEN';
        statusLabel = 'Dibatalkan (Override)';
      }

      return {
        ...log,
        status,
        statusLabel
      };
    });
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((log) => {
      const matchSymbol = filterSymbol === 'ALL' || log.symbol === filterSymbol;
      const matchDirection = filterDirection === 'ALL' || log.mode === filterDirection;
      const matchSession = filterSession === 'ALL' || getSessionGroup(log, dstMode) === filterSession;
      
      let matchStatus = true;
      if (filterStatus !== 'ALL') {
        matchStatus = log.status === filterStatus;
      }

      let matchDate = true;
      if (filterDate) {
        const logDateStr = new Date(log.created_at).toISOString().split('T')[0];
        matchDate = logDateStr === filterDate;
      }

      let matchTime = true;
      if (filterDate && (filterTimeFrom || filterTimeTo)) {
        const logHHmm = format(new Date(log.created_at), 'HH:mm');
        if (filterTimeFrom && logHHmm < filterTimeFrom) matchTime = false;
        if (filterTimeTo && logHHmm > filterTimeTo) matchTime = false;
      }

      return matchSymbol && matchDirection && matchSession && matchStatus && matchDate && matchTime;
    });
  }, [parsedLogs, filterSymbol, filterDirection, filterSession, filterStatus, filterDate, filterTimeFrom, filterTimeTo]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSymbol, filterDirection, filterSession, filterStatus, filterDate, filterTimeFrom, filterTimeTo, logs]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const filled = filteredLogs.filter(l => l.status === 'FILED').length;
    const expired = filteredLogs.filter(l => l.status === 'EXPIRED').length;
    const overridden = filteredLogs.filter(l => l.status === 'OVERRIDDEN').length;
    
    const fillRate = total > 0 ? (filled / total) * 100 : 0;
    const expireRate = total > 0 ? (expired / total) * 100 : 0;
    const overrideRate = total > 0 ? (overridden / total) * 100 : 0;
    
    const buys = filteredLogs.filter(l => l.mode === 'BUY');
    const buyTotal = buys.length;
    const buyFilled = buys.filter(l => l.status === 'FILED').length;
    const buyFillRate = buyTotal > 0 ? (buyFilled / buyTotal) * 100 : 0;
    
    const sells = filteredLogs.filter(l => l.mode === 'SELL');
    const sellTotal = sells.length;
    const sellFilled = sells.filter(l => l.status === 'FILED').length;
    const sellFillRate = sellTotal > 0 ? (sellFilled / sellTotal) * 100 : 0;
    
    return {
      total,
      filled,
      expired,
      overridden,
      fillRate,
      expireRate,
      overrideRate,
      buyTotal,
      buyFillRate,
      sellTotal,
      sellFillRate
    };
  }, [filteredLogs]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  return (
    <div className="space-y-4">
      {/* Summary Analytics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Limit Order */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Limit Order</span>
            <span className="text-2xl font-black text-white mt-1 block">{stats.total}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Seluruh pending limit order yang pernah dikirim ke MT5</p>
        </div>

        {/* Fill Rate */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider block">Fill Rate (Terisi)</span>
              <span className="text-2xl font-black text-green-400 mt-1 block">{stats.filled}</span>
            </div>
            <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full font-bold">
              {stats.fillRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Order limit yang berhasil tersentuh harga pasar</p>
        </div>

        {/* Expired vs Batal */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Expired vs Override</span>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Expired:</span>
                <span className="text-red-400 font-mono font-bold">{stats.expired} ({stats.expireRate.toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Override:</span>
                <span className="text-purple-400 font-mono font-bold">{stats.overridden} ({stats.overrideRate.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Buy vs Sell Fill Rate */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Buy vs Sell Fill Rate</span>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">BUY Limit:</span>
                <span className="text-green-400 font-mono font-bold">{stats.buyFillRate.toFixed(0)}% <span className="text-slate-500 font-normal">({stats.buyTotal} order)</span></span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">SELL Limit:</span>
                <span className="text-green-400 font-mono font-bold">{stats.sellFillRate.toFixed(0)}% <span className="text-slate-500 font-normal">({stats.sellTotal} order)</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filters Container */}
      <div className="bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-muted mr-2">
            <Filter size={18} />
            <span className="text-sm font-medium">Filter Pending Order</span>
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Status</option>
            <option value="FILED">Tersentuh (Filled)</option>
            <option value="EXPIRED">Expired (Batas Candle)</option>
            <option value="OVERRIDDEN">Dibatalkan (Override)</option>
          </select>

          {/* Filter Direction */}
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Arah</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
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
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
            <thead>
              <tr className="bg-slate-800/50 text-muted border-b border-slate-700/50">
                <th className="px-6 py-4 font-medium text-sm">Waktu Log</th>
                <th className="px-6 py-4 font-medium text-sm">Ticket ID</th>
                <th className="px-6 py-4 font-medium text-sm">Symbol</th>
                <th className="px-6 py-4 font-medium text-sm">Arah</th>
                <th className="px-6 py-4 font-medium text-sm">Sesi</th>
                <th className="px-6 py-4 font-medium text-sm">Rancangan Harga</th>
                <th className="px-6 py-4 font-medium text-sm">Status Hasil</th>
                <th className="px-6 py-4 font-medium text-sm">Catatan Sistem</th>
                <th className="px-6 py-4 font-medium text-sm text-center">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted">
                    Tidak ada riwayat pending order yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Waktu */}
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    
                    {/* Ticket ID */}
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">
                      #{log.ticket_id}
                    </td>

                    {/* Symbol */}
                    <td className="px-6 py-4 text-sm font-semibold text-text">
                      {log.symbol}
                    </td>

                    {/* Arah */}
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                          log.mode === 'BUY'
                            ? 'bg-success/20 text-success'
                            : 'bg-danger/20 text-danger'
                        )}
                      >
                        {log.mode === 'BUY' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {log.mode}
                      </span>
                    </td>

                    {/* Sesi */}
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700 text-xs font-mono text-slate-300">
                        <Globe size={11} className="text-primary" />
                        {log.trading_session || 'Unknown'}
                      </span>
                    </td>

                    {/* Rancangan Harga */}
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      <div>Limit: {log.op_price?.toFixed(5) || '-'}</div>
                      <div>SL: {log.sl_price?.toFixed(5) || '-'} | TP: {log.tp_price?.toFixed(5) || '-'}</div>
                    </td>

                    {/* Status Hasil */}
                    <td className="px-6 py-4 text-sm">
                      {log.status === 'FILED' ? (
                        <span className="inline-flex items-center gap-1 text-success font-medium bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 text-xs">
                          <CheckCircle size={13} />
                          Tersentuh (Filled)
                        </span>
                      ) : log.status === 'EXPIRED' ? (
                        <span className="inline-flex items-center gap-1 text-danger font-medium bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 text-xs">
                          <Clock size={13} />
                          Expired (Candle)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-xs">
                          <Trash2 size={13} />
                          Batal (Override)
                        </span>
                      )}
                    </td>

                    {/* Catatan Sistem */}
                    <td className="px-6 py-4 text-xs text-slate-400 max-w-[250px] truncate" title={log.message}>
                      {log.message}
                    </td>

                    {/* Screenshot Chart */}
                    <td className="px-6 py-4 text-center">
                      {log.image_url && (
                        <button
                          onClick={() => onImageClick(log.image_url!)}
                          className="text-primary hover:text-primary/80 transition-colors inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-primary/10"
                          title="View Screenshot"
                        >
                          <ImageIcon size={16} />
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
          <p className="text-sm text-muted">
            Menampilkan <span className="font-medium text-text">{(currentPage - 1) * itemsPerPage + 1}</span> sampai{' '}
            <span className="font-medium text-text">
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
            </span>{' '}
            dari <span className="font-medium text-text">{filteredLogs.length}</span> hasil
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
