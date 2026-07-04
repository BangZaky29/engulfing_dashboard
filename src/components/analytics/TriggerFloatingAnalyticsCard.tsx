import { useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { TradeTriggerAnalyticsRow } from '../../hooks/useTriggerAnalyticsData';
import { useTriggerAnalyticsData } from '../../hooks/useTriggerAnalyticsData';
import { StatCard } from '../StatCard';

function formatPct(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function formatMoney(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `$${v.toFixed(2)}`;
}

const CSV_COLUMNS: Array<keyof TradeTriggerAnalyticsRow> = [
  'trade_date',
  'symbol',
  'trigger_type',
  'mode',
  'tf_execute',
  'tf_monitor',
  'total_trades',
  'total_profit_count',
  'total_loss_count',
  'total_profit_usd',
  'total_loss_usd',
  'probability_profit',
  'max_negative_floating_before_profit_usd',
  'max_negative_floating_before_profit_pct',
  'sum_negative_floating_before_profit_usd',
];

function toCsvValue(v: unknown) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // escape double quotes
  const escaped = s.replaceAll('"', '""');
  // wrap if contains commas/newlines
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) return `"${escaped}"`;
  return escaped;
}

function buildCsv(rows: TradeTriggerAnalyticsRow[]) {
  const header = CSV_COLUMNS.join(',');
  const body = rows
    .map((r) =>
      CSV_COLUMNS
        .map((k) => toCsvValue((r as any)[k]))
        .join(',')
    )
    .join('\n');

  return `${header}\n${body}\n`;
}

export function TriggerFloatingAnalyticsCard() {
  const { latest, loading: loadingLatest, error: errorLatest, refetch } = useTriggerAnalyticsData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('ALL');
  const [triggerType, setTriggerType] = useState<string>('ALL');
  const [mode, setMode] = useState<string>('ALL');
  const [tfExecute, setTfExecute] = useState<string>('ALL');
  const [tfMonitor, setTfMonitor] = useState<string>('ALL');

  const [filteredRows, setFilteredRows] = useState<TradeTriggerAnalyticsRow[]>([]);

  const displayRows = filteredRows.length ? filteredRows : (latest ? [latest] : []);

  const topRows = useMemo(() => {
    const safe = displayRows.filter(r => r.probability_profit != null);
    return safe
      .sort((a, b) => (b.probability_profit ?? 0) - (a.probability_profit ?? 0))
      .slice(0, 5);
  }, [displayRows]);

  const fetchFiltered = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      let q = supabase
        .from('trade_trigger_analytics')
        .select('*');

      if (dateFrom) q = q.gte('trade_date', dateFrom);
      if (dateTo) q = q.lte('trade_date', dateTo);
      if (symbol !== 'ALL') q = q.eq('symbol', symbol);
      if (triggerType !== 'ALL') q = q.eq('trigger_type', triggerType);
      if (mode !== 'ALL') q = q.eq('mode', mode);
      if (tfExecute !== 'ALL') q = q.eq('tf_execute', tfExecute);
      if (tfMonitor !== 'ALL') q = q.eq('tf_monitor', tfMonitor);

      const { data, error: err } = await q
        .order('trade_date', { ascending: false })
        .limit(500);

      if (err) throw err;

      setFilteredRows(((data ?? []) as unknown) as TradeTriggerAnalyticsRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      console.error('Error fetching filtered trade_trigger_analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    try {
      setError(null);
      setLoading(true);

      let q = supabase
        .from('trade_trigger_analytics')
        .select(CSV_COLUMNS.join(','));

      if (dateFrom) q = q.gte('trade_date', dateFrom);
      if (dateTo) q = q.lte('trade_date', dateTo);
      if (symbol !== 'ALL') q = q.eq('symbol', symbol);
      if (triggerType !== 'ALL') q = q.eq('trigger_type', triggerType);
      if (mode !== 'ALL') q = q.eq('mode', mode);
      if (tfExecute !== 'ALL') q = q.eq('tf_execute', tfExecute);
      if (tfMonitor !== 'ALL') q = q.eq('tf_monitor', tfMonitor);

      const { data, error: err } = await q.order('trade_date', { ascending: false }).limit(20000);
      if (err) throw err;

      const rows = ((data ?? []) as unknown) as TradeTriggerAnalyticsRow[];
      const csv = buildCsv(rows);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const fileName = `trade_trigger_analytics_${dateFrom || 'ALL'}_${dateTo || 'ALL'}.csv`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      console.error('CSV download failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllCsv = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data, error: err } = await supabase
        .from('trade_trigger_analytics')
        .select(CSV_COLUMNS.join(','))
        .order('trade_date', { ascending: false })
        .limit(20000);

      if (err) throw err;

      const rows = ((data ?? []) as unknown) as TradeTriggerAnalyticsRow[];
      const csv = buildCsv(rows);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const fileName = `trade_trigger_analytics_ALL.csv`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      console.error('CSV download ALL failed:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loadingLatest) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl">
        <div className="text-slate-400 text-sm">Memuat analytics trigger/floating...</div>
      </div>
    );
  }

  if (errorLatest) {
    return (
      <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-lg">
        Error fetching trigger analytics: {errorLatest}
      </div>
    );
  }

  if (!latest && !filteredRows.length) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl">
        <div className="text-slate-400 text-sm">
          Belum ada data <span className="text-slate-200 font-medium">trade_trigger_analytics</span>.
          Jalankan bot sampai ada trade yang closed agar agregasi tersimpan.
        </div>
        <div className="mt-4">
          <button
            onClick={() => refetch(true)}
            className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const active = filteredRows.length ? filteredRows : (latest ? [latest] : []);

  return (
    <div className="space-y-4">
      {/* Filters + Download */}
      <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold text-white">Trigger Analytics (Floating Distribution)</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFiltered(true)}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-700 text-slate-200 text-sm disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Filter'}
            </button>
            <button
              onClick={() => downloadAllCsv()}
              disabled={loading}
              className="bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg border border-primary/30 text-primary text-sm disabled:opacity-50"
              title="Download semua data trade_trigger_analytics (limit 20000 row)"
            >
              Download All CSV
            </button>
            <button
              onClick={() => downloadCsv()}
              disabled={loading}
              className="bg-primary/30 hover:bg-primary/40 px-3 py-2 rounded-lg border border-primary/40 text-white text-sm disabled:opacity-50"
              title="Download data berdasarkan filter tanggal & filter lain"
            >
              Download Filter CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mb-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="ALL / BTC"
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">Trigger Type</label>
            <input
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              placeholder="ALL / Engulfing"
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            >
              <option value="ALL">ALL</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">tf_execute</label>
            <input
              value={tfExecute}
              onChange={(e) => setTfExecute(e.target.value)}
              placeholder="ALL / M5"
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-slate-400 block mb-1">tf_monitor</label>
            <input
              value={tfMonitor}
              onChange={(e) => setTfMonitor(e.target.value)}
              placeholder="ALL / M15"
              className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-400">
          Jika filter kosong/ALL, download akan tetap berbasis query sesuai batas limit (20000 row).
        </div>
      </div>

      {/* Stats */}
      <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <p className="text-sm text-slate-400 mb-3">
            Agregasi per <span className="text-slate-200 font-medium">trigger_type + mode</span> setelah trade close.
            Ini mencakup <b>probability_profit</b> dan <b>max negative floating</b> sebelum profit terjadi.
          </p>

          {active[0] ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                <StatCard title="Trade Count" value={`${active[0].total_trades ?? 0}`} icon={null} />
                <StatCard title="Probability Profit" value={formatPct(active[0].probability_profit)} icon={null} />
                <StatCard
                  title="Max Negative Floating"
                  value={formatMoney(active[0].max_negative_floating_before_profit_usd)}
                  icon={null}
                />
                <StatCard
                  title="Max Negative Floating %"
                  value={
                    active[0].max_negative_floating_before_profit_pct == null
                      ? '—'
                      : `${active[0].max_negative_floating_before_profit_pct.toFixed(1)}%`
                  }
                  icon={null}
                />
              </div>

              <div className="mt-4 text-sm text-slate-300">
                Sum Negative Floating (USD):{' '}
                <span className="text-slate-100 font-medium">
                  {formatMoney(active[0].sum_negative_floating_before_profit_usd)}
                </span>
              </div>

              <div className="mt-4 text-xs text-slate-400">
                Latest/Active key: {active[0].trade_date} · {active[0].symbol} · {active[0].trigger_type} · {active[0].mode} · {active[0].tf_execute}/{active[0].tf_monitor}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Tidak ada data.</div>
          )}
        </div>
      </div>

      {/* Top */}
      <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-md font-semibold text-white">Top Triggers by Probability Profit</h3>
          <div className="text-xs text-slate-400">Top 5 (current filtered set)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr className="text-left">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Symbol</th>
                <th className="py-2 pr-3">Trigger</th>
                <th className="py-2 pr-3">Mode</th>
                <th className="py-2 pr-3">Prob</th>
                <th className="py-2 pr-3">Max Neg (USD)</th>
              </tr>
            </thead>
            <tbody>
              {topRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-400">Tidak ada data probability_profit untuk filter ini.</td>
                </tr>
              ) : (
                topRows.map((r, idx) => (
                  <tr key={`${r.trade_date}-${r.symbol}-${r.trigger_type}-${r.mode}-${idx}`} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-slate-200">{r.trade_date}</td>
                    <td className="py-2 pr-3 text-slate-200">{r.symbol}</td>
                    <td className="py-2 pr-3 text-slate-200">{r.trigger_type}</td>
                    <td className="py-2 pr-3 text-slate-200">{r.mode}</td>
                    <td className="py-2 pr-3 font-semibold text-white">
                      {r.probability_profit == null ? '—' : `${(r.probability_profit * 100).toFixed(1)}%`}
                    </td>
                    <td className="py-2 pr-3 text-slate-200">{formatMoney(r.max_negative_floating_before_profit_usd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
