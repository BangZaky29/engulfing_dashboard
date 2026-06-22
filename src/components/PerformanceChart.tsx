import { useMemo } from 'react';
import type { TradeAnalytics } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface PerformanceChartProps {
  trades: TradeAnalytics[];
}


export function PerformanceChart({ trades }: PerformanceChartProps) {
  const uniqueSymbols = useMemo(() => Array.from(new Set(trades.map(t => t.symbol))).sort(), [trades]);
  const isMultiSymbol = uniqueSymbols.length > 1;

  const symbolColors: Record<string, string> = {
    'XAUUSD': '#fbbf24', // Amber/Gold
    'GBPUSD': '#3b82f6', // Blue
    'BTCUSD': '#f97316', // Orange
    'NASDAQ-100': '#a855f7', // Purple
  };

  const getColor = (sym: string, index: number) => {
    if (symbolColors[sym]) return symbolColors[sym];
    const fallbackColors = ['#ec4899', '#14b8a6', '#8b5cf6', '#ef4444', '#10b981'];
    return fallbackColors[index % fallbackColors.length];
  };

  const data = useMemo(() => {
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.trade_created_at).getTime() - new Date(b.trade_created_at).getTime()
    );

    // Track cumulative profit for all symbols
    const runningProfits: Record<string, number> = {};
    uniqueSymbols.forEach(sym => runningProfits[sym] = 0);
    let totalPortfolio = 0;

    return sortedTrades.map((trade) => {
      runningProfits[trade.symbol] = (runningProfits[trade.symbol] || 0) + (trade.profit || 0);
      totalPortfolio += (trade.profit || 0);

      const point: any = {
        time: format(new Date(trade.trade_created_at), 'dd MMM HH:mm'),
        total: Number(totalPortfolio.toFixed(2)),
      };
      
      uniqueSymbols.forEach(sym => {
        point[sym] = Number(runningProfits[sym].toFixed(2));
      });

      return point;
    });
  }, [trades, uniqueSymbols]);

  const off = useMemo(() => {
    if (data.length === 0 || isMultiSymbol) return 1;
    const sym = uniqueSymbols[0];
    const profits = data.map((d: any) => d[sym]);
    const dataMax = Math.max(...profits);
    const dataMin = Math.min(...profits);

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  }, [data, isMultiSymbol, uniqueSymbols]);

  if (trades.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg p-6 h-[400px] flex items-center justify-center">
        <p className="text-muted">Not enough data to display chart.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg p-6">
      <h3 className="text-lg font-semibold text-text mb-4">
        {isMultiSymbol ? 'Cumulative Profit by Pair' : `Cumulative Profit (${uniqueSymbols[0]})`}
      </h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            {!isMultiSymbol && (
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset={off} stopColor="#38bdf8" stopOpacity={0} />
                  <stop offset={off} stopColor="#ef4444" stopOpacity={0} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="strokeProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={off} stopColor="#38bdf8" stopOpacity={1} />
                  <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              fontSize={12}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: '#f8fafc',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              formatter={(value: any, name: any) => [
                <span style={{ color: Number(value) >= 0 ? '#10b981' : '#ef4444' }}>
                  {`$${value}`}
                </span>,
                String(name || '')
              ]}
            />
            
            {isMultiSymbol ? (
              uniqueSymbols.map((sym, idx) => (
                <Area
                  key={sym}
                  type="monotone"
                  dataKey={sym}
                  name={sym}
                  stroke={getColor(sym, idx)}
                  strokeWidth={2}
                  fill="none"
                  fillOpacity={0}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={uniqueSymbols[0]}
                name={uniqueSymbols[0]}
                stroke="url(#strokeProfit)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorProfit)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
