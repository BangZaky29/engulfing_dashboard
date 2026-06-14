import { useMemo } from 'react';
import type { TradeAnalytics, EngulfingSignal } from '../../types';
import { Filter, ArrowDown, Activity } from 'lucide-react';

interface SignalFunnelChartProps {
  trades: TradeAnalytics[];
  signals: EngulfingSignal[];
}

export function SignalFunnelChart({ trades, signals }: SignalFunnelChartProps) {
  const { totalSignals, totalTrades, conversionRate, rejectedSignals } = useMemo(() => {
    const totalSignals = signals.length;
    const totalTrades = trades.length;
    const rejectedSignals = totalSignals - totalTrades;
    const conversionRate = totalSignals > 0 ? (totalTrades / totalSignals) * 100 : 0;
    
    return { totalSignals, totalTrades, conversionRate, rejectedSignals };
  }, [trades, signals]);

  if (signals.length === 0) {
    return <div className="text-slate-400 text-sm py-4">Belum ada data sinyal untuk memuat funnel.</div>;
  }

  return (
    <div className="flex flex-col items-center py-4 w-full">
      {/* Step 1: All Signals */}
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center relative">
        <Activity className="text-primary mb-2" size={24} />
        <h3 className="text-white font-semibold">Total Sinyal Mentah</h3>
        <p className="text-3xl font-bold text-primary mt-1">{totalSignals}</p>
        <p className="text-xs text-slate-400 text-center mt-2">Semua pola Engulfing yang dideteksi oleh MT5</p>
      </div>

      {/* Arrow Down */}
      <div className="py-2 flex flex-col items-center">
        <div className="h-6 w-px bg-slate-700"></div>
        <div className="bg-slate-800 border border-slate-700 rounded-full p-2 my-1 relative group">
          <Filter className="text-warning" size={16} />
          
          {/* Tooltip for Rejected */}
          <div className="absolute top-1/2 left-full ml-4 -translate-y-1/2 bg-slate-800 border border-slate-700 text-xs text-slate-300 p-2 rounded-lg w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-danger font-bold">{rejectedSignals} Sinyal Ditolak</span> karena Grade buruk (C, D) atau tidak lolos konfirmasi EMA/Ring.
          </div>
        </div>
        <div className="h-6 w-px bg-slate-700"></div>
      </div>

      {/* Step 2: Executed Trades */}
      <div className="w-4/5 max-w-xs bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col items-center justify-center">
        <h3 className="text-white font-semibold">Eksekusi Trade (OP)</h3>
        <p className="text-3xl font-bold text-success mt-1">{totalTrades}</p>
        <div className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-full mt-2">
          {conversionRate.toFixed(1)}% Conversion Rate
        </div>
      </div>
    </div>
  );
}
