import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell
} from 'recharts';
import type { TradeAnalytics } from '../../types';

interface HoldingTimeChartProps {
  trades: TradeAnalytics[];
}

export function HoldingTimeChart({ trades }: HoldingTimeChartProps) {
  const data = useMemo(() => {
    return trades
      .filter(t => t.entry_time && t.exit_time && t.profit != null)
      .map(t => {
        const entry = new Date(t.entry_time!).getTime();
        const exit = new Date(t.exit_time!).getTime();
        const durationMinutes = (exit - entry) / (1000 * 60);
        
        return {
          duration: Number(durationMinutes.toFixed(1)),
          profit: t.profit,
          result: t.result,
          symbol: t.symbol,
          ticket: t.ticket_id
        };
      })
      .filter(t => t.duration > 0 && t.duration < 10000); // Filter out anomalies
  }, [trades]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm text-center px-4">
        Belum ada data holding time. Pastikan trade memiliki entry_time dan exit_time.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
          <p className="text-white font-bold mb-1">Ticket #{d.ticket}</p>
          <p className="text-slate-300 text-sm mb-2">{d.symbol}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-400">Holding Time: <span className="font-semibold text-white">{d.duration} mnt</span></p>
            <p className={d.profit >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>
              Profit: ${d.profit}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            type="number" 
            dataKey="duration" 
            name="Holding Time" 
            unit="m" 
            stroke="#94a3b8" 
            fontSize={12}
            label={{ value: 'Durasi Penahanan (Menit)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis 
            type="number" 
            dataKey="profit" 
            name="Profit" 
            unit="$" 
            stroke="#94a3b8" 
            fontSize={12}
            label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          />
          <ZAxis type="number" range={[60, 60]} />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: '3 3' }} 
          />
          <Scatter name="Trades" data={data}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.profit && entry.profit > 0 ? '#10b981' : '#f43f5e'} opacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
