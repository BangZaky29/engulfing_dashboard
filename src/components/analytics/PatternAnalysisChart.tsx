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

interface PatternAnalysisChartProps {
  trades: TradeAnalytics[];
}

export function PatternAnalysisChart({ trades }: PatternAnalysisChartProps) {
  const data = useMemo(() => {
    return trades
      .filter(t => t.engulf_ratio != null && t.profit != null)
      .map(t => ({
        ratio: t.engulf_ratio,
        profit: t.profit,
        result: t.result,
        symbol: t.symbol,
        ticket: t.ticket_id
      }));
  }, [trades]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        No pattern data available (ensure trades have engulf_ratio)
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            type="number" 
            dataKey="ratio" 
            name="Engulf Ratio" 
            unit="x" 
            stroke="#94a3b8" 
            fontSize={12}
            label={{ value: 'Engulf Ratio (Body multiplier)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
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
            cursor={{ strokeDasharray: '3 3' }} 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Scatter name="Trades" data={data}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.profit && entry.profit > 0 ? '#10b981' : '#f43f5e'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
