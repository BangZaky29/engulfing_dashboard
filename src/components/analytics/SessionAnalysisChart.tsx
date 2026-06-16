import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import type { TradeAnalytics } from '../../types';

interface SessionAnalysisChartProps {
  trades: TradeAnalytics[];
}

export function SessionAnalysisChart({ trades }: SessionAnalysisChartProps) {
  const data = useMemo(() => {
    const sessionMap = {
      Asia: { name: 'Sesi Asia', total: 0, wins: 0, profit: 0 },
      Euro: { name: 'Sesi Eropa', total: 0, wins: 0, profit: 0 },
      NY: { name: 'Sesi NY (Amerika)', total: 0, wins: 0, profit: 0 },
      Unknown: { name: 'Lainnya', total: 0, wins: 0, profit: 0 }
    };

    trades.forEach((trade) => {
      const session = trade.trading_session || 'Unknown';
      let key: 'Asia' | 'Euro' | 'NY' | 'Unknown' = 'Unknown';
      if (session.toLowerCase().includes('asia')) {
        key = 'Asia';
      } else if (session.toLowerCase().includes('euro') || session.toLowerCase().includes('london')) {
        key = 'Euro';
      } else if (session.toLowerCase().includes('ny') || session.toLowerCase().includes('york')) {
        key = 'NY';
      }

      sessionMap[key].total += 1;
      if (trade.result === 'PROFIT') {
        sessionMap[key].wins += 1;
      }
      sessionMap[key].profit += (trade.profit || 0);
    });

    return Object.values(sessionMap)
      .map(s => ({
        ...s,
        winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0
      }))
      .filter(s => s.total > 0);
  }, [trades]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Tidak ada data sesi trading tersedia untuk periode ini.
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            yAxisId="left"
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value: any, name: any) => [
              name === 'winRate' ? `${value.toFixed(1)}%` : `$${value.toFixed(2)}`,
              name === 'winRate' ? 'Win Rate' : 'Net Profit'
            ]}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar yAxisId="left" dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-rate-${index}`} fill={entry.winRate >= 50 ? '#10b981' : '#f43f5e'} />
            ))}
          </Bar>
          <Bar yAxisId="right" dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-profit-${index}`} fill={entry.profit >= 0 ? '#3b82f6' : '#f97316'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
