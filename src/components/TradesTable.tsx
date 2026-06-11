import { useState, useMemo, useEffect } from 'react';
import type { TradeAnalytics } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { ImageIcon, Filter } from 'lucide-react';

interface TradesTableProps {
  trades: TradeAnalytics[];
  onImageClick: (url: string) => void;
}

export function TradesTable({ trades, onImageClick }: TradesTableProps) {
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterResult, setFilterResult] = useState<string>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  
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
      
      let matchDate = true;
      if (filterDate) {
        // Trade created_at is likely ISO string or timestamp
        const tradeDateStr = new Date(trade.created_at).toISOString().split('T')[0];
        matchDate = tradeDateStr === filterDate;
      }

      return matchMode && matchResult && matchSymbol && matchDate;
    });
  }, [trades, filterMode, filterResult, filterSymbol, filterDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, filterResult, filterSymbol, filterDate, trades]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrades, currentPage]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
        <div className="flex items-center gap-2 text-muted mr-2">
          <Filter size={18} />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
        >
          <option value="ALL">All Modes</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>

        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
        >
          <option value="ALL">All Results</option>
          <option value="PROFIT">PROFIT</option>
          <option value="LOSS">LOSS</option>
        </select>

        <select
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
        >
          <option value="ALL">All Symbols</option>
          {uniqueSymbols.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>

        {/* Date Picker Filter */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm rounded-lg pl-3 pr-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark]"
            title="Filter by Specific Date"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="absolute right-10 text-slate-400 hover:text-white transition-colors"
              title="Clear Date Filter"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[340px] md:min-w-full">
            <thead>
              <tr className="bg-slate-800/50 text-muted border-b border-slate-700/50">
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Time</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Symbol</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Mode</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Result</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm">Profit</th>
                {/* Sembunyikan kolom Entry-Exit di layar kecil (mobile) */}
                <th className="hidden md:table-cell px-6 py-4 font-medium text-sm">Entry - Exit</th>
                <th className="px-3 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm text-center">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
                    No trades match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-300">
                      <div className="md:hidden">{format(new Date(trade.created_at), 'dd MMM')}</div>
                      <div className="md:hidden text-muted text-[10px]">{format(new Date(trade.created_at), 'HH:mm')}</div>
                      <span className="hidden md:inline">{format(new Date(trade.created_at), 'dd MMM yyyy HH:mm')}</span>
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
                    {/* Sembunyikan kolom Entry-Exit di layar kecil (mobile) */}
                    <td className="hidden md:table-cell px-6 py-4 text-xs text-muted">
                      <div>Entry: {trade.op_price}</div>
                      <div>Exit: {trade.result === 'PROFIT' ? trade.tp_price : trade.sl_price}</div>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-slate-700/50 shadow-md">
          <p className="text-sm text-muted">
            Showing <span className="font-medium text-text">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium text-text">
              {Math.min(currentPage * itemsPerPage, filteredTrades.length)}
            </span>{' '}
            of <span className="font-medium text-text">{filteredTrades.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-300 font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
