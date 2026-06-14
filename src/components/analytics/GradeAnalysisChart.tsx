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

interface GradeAnalysisChartProps {
  trades: TradeAnalytics[];
}

export function GradeAnalysisChart({ trades }: GradeAnalysisChartProps) {
  const data = useMemo(() => {
    const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];
    const summary: Record<string, { win: number; loss: number; profit: number }> = {};
    
    grades.forEach(g => summary[g] = { win: 0, loss: 0, profit: 0 });

    trades.forEach(trade => {
      let grade = 'D';
      try {
        if (trade.notes) {
          const n = JSON.parse(trade.notes);
          grade = n.grade || 'D';
        }
      } catch (e) {}

      if (!summary[grade]) {
        summary[grade] = { win: 0, loss: 0, profit: 0 };
      }
      
      if (trade.result === 'PROFIT') summary[grade].win++;
      else summary[grade].loss++;
      
      if (trade.profit) {
        summary[grade].profit += trade.profit;
      }
    });

    return grades.map(g => {
      const total = summary[g].win + summary[g].loss;
      const winRate = total > 0 ? (summary[g].win / total) * 100 : 0;
      return {
        grade: g,
        winRate: Number(winRate.toFixed(1)),
        netProfit: Number(summary[g].profit.toFixed(2)),
        totalTrades: total,
        winCount: summary[g].win,
        lossCount: summary[g].loss
      };
    }).filter(item => item.totalTrades > 0);
  }, [trades]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        No grade data available
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
          <p className="text-white font-bold mb-2">Grade {label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">Total Trades: <span className="font-semibold text-white">{d.totalTrades}</span></p>
            <p className="text-success">Win: {d.winCount}</p>
            <p className="text-danger">Loss: {d.lossCount}</p>
            <p className="text-primary mt-2">Win Rate: <span className="font-bold">{d.winRate}%</span></p>
            <p className={d.netProfit >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>
              Net Profit: ${d.netProfit}
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
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="grade" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            yAxisId="left"
            orientation="left"
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar yAxisId="left" dataKey="winRate" name="Win Rate (%)" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? '#38bdf8' : '#fb7185'} />
            ))}
          </Bar>
          <Bar yAxisId="right" dataKey="netProfit" name="Net Profit ($)" radius={[4, 4, 0, 0]}>
             {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? '#10b981' : '#f43f5e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
