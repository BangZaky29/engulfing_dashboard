import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import type { TradeAnalytics } from '../../types';

interface HourlyWinRateChartProps {
  trades: TradeAnalytics[];
}

export function HourlyWinRateChart({ trades }: HourlyWinRateChartProps) {
  const data = useMemo(() => {
    const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      hourLabel: `${i.toString().padStart(2, '0')}:00`,
      wins: 0,
      losses: 0,
      total: 0,
      winRate: 0,
    }));

    trades.forEach((trade) => {
      if (!trade.entry_time) return;
      
      const date = new Date(trade.entry_time);
      const hour = date.getHours();
      
      hourlyStats[hour].total += 1;
      if (trade.result === 'PROFIT') {
        hourlyStats[hour].wins += 1;
      } else {
        hourlyStats[hour].losses += 1;
      }
    });

    return hourlyStats.map(stat => ({
      ...stat,
      winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0
    })).filter(stat => stat.total > 0); // Only show hours with activity
  }, [trades]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        No data available for the selected period
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="hourLabel" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value: number, name: string) => [
              name === 'winRate' ? `${value.toFixed(1)}%` : value,
              name === 'winRate' ? 'Win Rate' : name === 'wins' ? 'Wins' : 'Losses'
            ]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? '#10b981' : '#f43f5e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
