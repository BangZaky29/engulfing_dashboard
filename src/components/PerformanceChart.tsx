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

interface ChartDataPoint {
  time: string;
  profit: number;
  tradeProfit: number | null;
}

export function PerformanceChart({ trades }: PerformanceChartProps) {
  const data = useMemo(() => {
    // Sort ascending for chart (oldest to newest)
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return sortedTrades.reduce<ChartDataPoint[]>((acc, trade) => {
      const lastProfit = acc.length > 0 ? acc[acc.length - 1].profit : 0;
      const newProfit = lastProfit + (trade.profit || 0);
      acc.push({
        time: format(new Date(trade.created_at), 'dd MMM HH:mm'),
        profit: Number(newProfit.toFixed(2)),
        tradeProfit: trade.profit,
      });
      return acc;
    }, []);
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg p-6 h-[400px] flex items-center justify-center">
        <p className="text-muted">Not enough data to display chart.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-slate-700/50 shadow-lg p-6">
      <h3 className="text-lg font-semibold text-text mb-4">Cumulative Profit Performance</h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              itemStyle={{ color: '#38bdf8' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              formatter={(value: number) => [`$${value}`, 'Cumulative Profit']}
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProfit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
