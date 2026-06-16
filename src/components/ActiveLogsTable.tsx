import { useState, useMemo, useEffect } from 'react';
import type { TradeActiveLog } from '../types';
import { format } from 'date-fns';
import { cn, getSessionGroup } from '../lib/utils';
import { Filter, CheckCircle, ArrowUpRight, ArrowDownRight, Globe, Trash2, Clock } from 'lucide-react';

interface ActiveLogsTableProps {
  logs: TradeActiveLog[];
}

export function ActiveLogsTable({ logs }: ActiveLogsTableProps) {
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  
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
      const matchSession = filterSession === 'ALL' || getSessionGroup(log) === filterSession;
      
      let matchStatus = true;
      if (filterStatus !== 'ALL') {
        matchStatus = log.status === filterStatus;
      }

      return matchSymbol && matchDirection && matchSession && matchStatus;
    });
  }, [parsedLogs, filterSymbol, filterDirection, filterSession, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSymbol, filterDirection, filterSession, filterStatus, logs]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  return (
    <div className="space-y-4">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted">
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
