// =====================================================
// components/analytics/TradePerOpTable.tsx
// Tabel per OP: 1 row = 1 trade, lengkap dengan floating analytics
// Data utama: trade_analytics
// Data floating: trade_floating_snapshots (max float per ticket)
// =====================================================

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────────
interface TradeRow {
  id: number;         // PK di DB namanya "id", bukan "trade_id"
  ticket_id: number;
  symbol: string;
  timeframe: string;
  mode: 'BUY' | 'SELL';
  result: 'PROFIT' | 'LOSS';
  profit: number | null;
  op_price: number | null;
  sl_price: number | null;
  tp_price: number | null;
  exit_price: number | null;
  entry_time: string | null;
  exit_time: string | null;
  trigger_type?: string | null;
  trading_session?: string | null;
}

interface FloatSummary {
  ticket_id: number;
  max_float_usd: number | null;   // worst floating USD (abs)
  max_float_pct: number | null;   // worst floating pct dari entry (abs)
  max_pts: number | null;         // max distance dalam points
}

interface EnrichedRow extends TradeRow {
  max_float_usd: number | null;
  max_float_pct: number | null;
  max_pts: number | null;
}

// ─── Helpers ─────────────────────────────────────────
function fmtMoney(v: number | null | undefined, sign = false) {
  if (v == null || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  const prefix = sign ? (v >= 0 ? '+' : '-') : '';
  return `${prefix}$${abs.toFixed(2)}`;
}

function fmtPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Math.abs(v).toFixed(2)}%`;
}

function fmtPts(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Math.round(Math.abs(v))} pts`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ─── Component ───────────────────────────────────────
export function TradePerOpTable() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [floatMap, setFloatMap] = useState<Record<number, FloatSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [symbol, setSymbol] = useState('ALL');
  const [mode, setMode] = useState('ALL');
  const [result, setResult] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // ── Fetch trade_analytics ──
  const fetchTrades = async () => {
    try {
      setLoading(true);
      setError(null);

      let q = supabase
        .from('trade_analytics')
        .select(
          'id,ticket_id,symbol,timeframe,mode,result,profit,op_price,sl_price,tp_price,exit_price,entry_time,exit_time,volume,trading_session,trigger_type'
        )
        .order('entry_time', { ascending: false })
        .limit(500);

      if (dateFrom) q = q.gte('entry_time', dateFrom);
      if (dateTo)   q = q.lte('entry_time', dateTo + 'T23:59:59');
      if (symbol !== 'ALL') q = q.eq('symbol', symbol);
      if (mode !== 'ALL')   q = q.eq('mode', mode);
      if (result !== 'ALL') q = q.eq('result', result);

      const { data, error: err } = await q;
      if (err) throw err;

      const rows = (data ?? []) as TradeRow[];
      setTrades(rows);
      setPage(1);

      // ── Fetch floating summary per ticket ──
      if (rows.length > 0) {
        const ticketIds = rows.map((r) => r.ticket_id);
        await fetchFloatSummary(ticketIds);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === 'object' && e !== null && 'message' in e ? String((e as any).message) : JSON.stringify(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchFloatSummary = async (ticketIds: number[]) => {
    try {
      // Ambil semua snapshot negatif (floating loss) per ticket
      const { data, error: err } = await supabase
        .from('trade_floating_snapshots')
        .select('ticket_id,floating_profit_usd,floating_pct_from_entry,entry_price,current_price,point')
        .in('ticket_id', ticketIds)
        .lt('floating_profit_usd', 0); // hanya snapshot yang sedang rugi

      if (err) throw err;

      // Agregasi per ticket: cari worst float
      const map: Record<number, FloatSummary> = {};

      for (const snap of data ?? []) {
        const tid = snap.ticket_id as number;
        const usd = parseFloat(snap.floating_profit_usd ?? 0);
        const pct = parseFloat(snap.floating_pct_from_entry ?? 0);
        const ep  = parseFloat(snap.entry_price ?? 0);
        const cp  = parseFloat(snap.current_price ?? 0);
        const pt  = parseFloat(snap.point ?? 0);

        // distance in points
        const pts = ep && cp && pt ? Math.abs(cp - ep) / pt : null;

        if (!map[tid]) {
          map[tid] = { ticket_id: tid, max_float_usd: null, max_float_pct: null, max_pts: null };
        }

        const cur = map[tid];
        // worst USD = paling negatif → abs terbesar
        if (cur.max_float_usd == null || Math.abs(usd) > cur.max_float_usd) {
          cur.max_float_usd = Math.abs(usd);
        }
        // worst pct = abs terbesar
        if (cur.max_float_pct == null || Math.abs(pct) > cur.max_float_pct) {
          cur.max_float_pct = Math.abs(pct);
        }
        // worst pts
        if (pts != null && (cur.max_pts == null || pts > cur.max_pts)) {
          cur.max_pts = pts;
        }
      }

      setFloatMap(map);
    } catch (e) {
      console.error('Gagal fetch floating summary:', e);
    }
  };

  useEffect(() => {
    void fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Enriched rows ──
  const enriched: EnrichedRow[] = useMemo(() => {
    return trades.map((t) => ({
      ...t,
      max_float_usd: floatMap[t.ticket_id]?.max_float_usd ?? null,
      max_float_pct: floatMap[t.ticket_id]?.max_float_pct ?? null,
      max_pts:       floatMap[t.ticket_id]?.max_pts ?? null,
    }));
  }, [trades, floatMap]);

  // ── Pagination ──
  const totalPages = Math.ceil(enriched.length / PER_PAGE);
  const pageRows   = enriched.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Summary stats ──
  const stats = useMemo(() => {
    const profit = enriched.filter(r => r.result === 'PROFIT');
    const loss   = enriched.filter(r => r.result === 'LOSS');
    const totalPnl = enriched.reduce((s, r) => s + (r.profit ?? 0), 0);
    const maxFloat = enriched.reduce((mx, r) => Math.max(mx, r.max_float_usd ?? 0), 0);
    return {
      total: enriched.length,
      profitCount: profit.length,
      lossCount:   loss.length,
      winRate: enriched.length ? (profit.length / enriched.length * 100) : 0,
      totalPnl,
      maxFloat,
    };
  }, [enriched]);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <h2 className="text-lg font-semibold text-white">Trade Per OP — Detail Profit/Loss & Floating</h2>
          </div>
          <button
            onClick={() => fetchTrades()}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Filter & Refresh'}
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Symbol</label>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              placeholder="ALL / BTC"
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Mode</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            >
              <option value="ALL">ALL</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Result</label>
            <select
              value={result}
              onChange={e => setResult(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            >
              <option value="ALL">ALL</option>
              <option value="PROFIT">PROFIT</option>
              <option value="LOSS">LOSS</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Summary stat cards ── */}
      {!loading && enriched.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total OP', value: stats.total.toString() },
            { label: 'Profit', value: stats.profitCount.toString(), green: true },
            { label: 'Loss', value: stats.lossCount.toString(), red: true },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, green: stats.winRate >= 50 },
            { label: 'Net PnL', value: fmtMoney(stats.totalPnl, true), green: stats.totalPnl >= 0, red: stats.totalPnl < 0 },
            { label: 'Max Float (USD)', value: `$${stats.maxFloat.toFixed(2)}`, red: true },
          ].map(({ label, value, green, red }) => (
            <div key={label} className="bg-slate-800/60 border border-white/5 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-400 mb-1">{label}</div>
              <div className={`text-lg font-bold ${green ? 'text-green-400' : red ? 'text-red-400' : 'text-white'}`}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-surface rounded-xl border border-white/5 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            1 Row = 1 OP
            {enriched.length > 0 && (
              <span className="ml-2 text-xs text-slate-400 font-normal">
                ({enriched.length} trade · halaman {page}/{totalPages})
              </span>
            )}
          </h3>
          <span className="text-xs text-slate-500">* floating = worst drawdown sebelum TP/SL</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/5 bg-slate-900/40">
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Ticket</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Entry Time</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Symbol</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">TF</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Mode</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Result</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium text-right">Profit (USD)</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium text-right">
                  <span className="text-orange-400">Max Float (USD)</span>
                </th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium text-right">
                  <span className="text-orange-400">Max Float (%)</span>
                </th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium text-right">
                  <span className="text-orange-400">Max Pts</span>
                </th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Trigger</th>
                <th className="px-4 py-3 text-xs text-slate-400 font-medium">Session</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-sm">
                    Memuat data...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-sm">
                    Tidak ada data. Coba ubah filter atau jalankan bot dulu.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const isProfit = row.result === 'PROFIT';
                  const hasFloat = row.max_float_usd != null;

                  return (
                    <tr
                      key={row.ticket_id}
                      className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Ticket */}
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                        #{row.ticket_id}
                      </td>

                      {/* Entry Time */}
                      <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                        {fmtDate(row.entry_time)}
                      </td>

                      {/* Symbol */}
                      <td className="px-4 py-3 text-white font-medium">
                        {row.symbol}
                      </td>

                      {/* TF */}
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                          {row.timeframe}
                        </span>
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          row.mode === 'BUY'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-purple-500/15 text-purple-400'
                        }`}>
                          {row.mode}
                        </span>
                      </td>

                      {/* Result */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isProfit
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}>
                          {row.result}
                        </span>
                      </td>

                      {/* Profit USD */}
                      <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
                        isProfit ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {fmtMoney(row.profit, true)}
                      </td>

                      {/* Max Float USD */}
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {hasFloat ? (
                          <span className="text-orange-400">
                            -{fmtMoney(row.max_float_usd)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">no data</span>
                        )}
                      </td>

                      {/* Max Float Pct */}
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {row.max_float_pct != null ? (
                          <span className="text-orange-300">
                            {fmtPct(row.max_float_pct)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Max Pts */}
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {row.max_pts != null ? (
                          <span className="text-yellow-400">
                            {fmtPts(row.max_pts)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Trigger */}
                        <td className="px-4 py-3">
                        {row.trigger_type ? (
                            <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded font-medium">
                            {row.trigger_type}
                            </span>
                        ) : (
                            <span className="text-slate-600 text-xs">—</span>
                        )}
                        </td>

                        {/* Session */}
                        <td className="px-4 py-3 text-slate-400 text-xs">
                        {row.trading_session ?? '—'}
                        </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Halaman {page} dari {totalPages} · {enriched.length} total OP
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs disabled:opacity-40 hover:bg-slate-700"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded text-xs ${
                      p === page
                        ? 'bg-primary text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs disabled:opacity-40 hover:bg-slate-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}