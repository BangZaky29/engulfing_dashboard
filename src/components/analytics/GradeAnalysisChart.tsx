import { useMemo, useState } from 'react';
import { X, Clock } from 'lucide-react';
import { format } from 'date-fns';
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
import { DateRangePicker } from '../ui/DateRangePicker';

interface GradeAnalysisChartProps {
  trades: TradeAnalytics[];
}

export function GradeAnalysisChart({ trades }: GradeAnalysisChartProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterTimeFrom, setFilterTimeFrom] = useState<string>('');
  const [filterTimeTo, setFilterTimeTo] = useState<string>('');

  const clearTimeFilter = () => {
    setFilterTimeFrom('');
    setFilterTimeTo('');
  };

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(trades.map(t => t.symbol));
    return Array.from(symbols).sort();
  }, [trades]);

  const data = useMemo(() => {
    const filteredTrades = trades.filter(t => {
      // Filter Symbol
      if (selectedSymbol !== 'ALL' && t.symbol !== selectedSymbol) return false;
      
      // Filter Date
      const tradeDateStr = new Date(t.trade_created_at).toISOString().split('T')[0];
      if (dateFrom && tradeDateStr < dateFrom) return false;
      if (dateTo && tradeDateStr > dateTo) return false;
        
      // Filter Time
      if (filterTimeFrom || filterTimeTo) {
        const tradeHHmm = format(new Date(t.trade_created_at), 'HH:mm');
        if (filterTimeFrom && tradeHHmm < filterTimeFrom) return false;
        if (filterTimeTo && tradeHHmm > filterTimeTo) return false;
      }
      return true;
    });

    const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'N/A'];
    const summary: Record<string, { win: number; loss: number; profit: number }> = {};
    
    grades.forEach(g => summary[g] = { win: 0, loss: 0, profit: 0 });

    filteredTrades.forEach(trade => {
      let grade = 'N/A';
      try {
        if (trade.notes) {
          const n = JSON.parse(trade.notes);
          grade = n.grade || 'N/A';
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
  }, [trades, selectedSymbol, dateFrom, dateTo, filterTimeFrom, filterTimeTo]);

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
    <div className="flex flex-col w-full">
      <div className="flex flex-col lg:flex-row flex-wrap gap-4 mb-2 mt-4 items-start lg:items-center">
        {/* Symbol Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSymbol('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSymbol === 'ALL'
                ? 'bg-primary text-slate-900 shadow-md'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Mata Uang
          </button>
          {uniqueSymbols.map(sym => (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedSymbol === sym
                  ? 'bg-primary text-slate-900 shadow-md'
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Date and Time Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
              if (!f && !t) clearTimeFilter();
            }}
            className="bg-slate-800 border-slate-700 h-[34px]"
            placeholder="Select Date"
          />

          {(dateFrom || dateTo) && (
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <Clock size={14} className="text-primary shrink-0" />
              <input
                type="time"
                value={filterTimeFrom}
                onChange={(e) => setFilterTimeFrom(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark] w-28"
              />
              <span className="text-muted text-xs">–</span>
              <input
                type="time"
                value={filterTimeTo}
                onChange={(e) => setFilterTimeTo(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary [color-scheme:dark] w-28"
              />
            </div>
          )}
        </div>
      </div>

      <div className="h-72 w-full mt-2">
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
    </div>
  );
}
