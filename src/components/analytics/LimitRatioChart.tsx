import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { TradeActiveLog } from '../../types';

interface LimitRatioChartProps {
  logs: TradeActiveLog[];
}

export function LimitRatioChart({ logs }: LimitRatioChartProps) {
  const data = useMemo(() => {
    let filled = 0;
    let expired = 0;
    let overridden = 0;

    logs.forEach((log) => {
      const msg = log.message.toUpperCase();
      if (msg.includes('EXPIRED') || msg.includes('KADALUWARSA')) {
        expired += 1;
      } else if (msg.includes('OVERRIDDEN') || msg.includes('DIBATALKAN')) {
        overridden += 1;
      } else {
        filled += 1;
      }
    });

    const total = filled + expired + overridden;

    return [
      { name: 'Tersentuh (Filled)', value: filled, percentage: total > 0 ? (filled / total) * 100 : 0, color: '#10b981' },
      { name: 'Expired (Candle)', value: expired, percentage: total > 0 ? (expired / total) * 100 : 0, color: '#ef4444' },
      { name: 'Batal (Override)', value: overridden, percentage: total > 0 ? (overridden / total) * 100 : 0, color: '#a855f7' }
    ].filter(item => item.value > 0);
  }, [logs]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Tidak ada data pending order tersedia.
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value: any, name: any, props: any) => [
              `${value} (${props.payload.percentage.toFixed(1)}%)`,
              name
            ]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            wrapperStyle={{ fontSize: '11px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
