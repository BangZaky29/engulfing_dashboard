import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';
import { 
  Globe, 
  Target, 
  Flame, 
  Percent, 
  Activity, 
  DollarSign, 
  Layers
} from 'lucide-react';
import type { TradeAnalytics, EngulfingSignal } from '../../types';
import { getSessionGroup } from '../../lib/utils';

interface SessionAnalysisChartProps {
  trades: TradeAnalytics[];
  signals?: EngulfingSignal[];
}

// Helper to determine point size based on symbol name and reference price
const getPointMultiplier = (symbol: string, price: number): number => {
  const s = symbol.toUpperCase();
  if (s.includes('XAU') || s.includes('GOLD')) return 0.01;
  if (s.includes('JPY')) return 0.001;
  if (s.includes('BTC') || s.includes('ETH')) return 0.01;
  if (price < 10) return 0.00001;
  return 0.01;
};

// Suffix formatting
const formatNumber = (num: number, dec = 1) => num.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function SessionAnalysisChart({ trades, signals = [] }: SessionAnalysisChartProps) {
  const [capitalInput, setCapitalInput] = useState<string>(() => {
    return localStorage.getItem('session_analysis_capital') || '10000';
  });

  const capital = useMemo(() => {
    const parsed = parseFloat(capitalInput);
    return isNaN(parsed) || parsed <= 0 ? 10000 : parsed;
  }, [capitalInput]);

  const handleCapitalChange = (val: string) => {
    setCapitalInput(val);
    localStorage.setItem('session_analysis_capital', val);
  };

  // Session Definition
  const sessionsDef = useMemo(() => [
    { key: 'Asia', name: 'Sesi Asia', time: '07:00 - 14:00 WIB', color: '#fbbf24', emoji: '🌅' },
    { key: 'Asia/Euro', name: 'Overlap Asia/Euro', time: '14:00 - 16:00 WIB', color: '#f59e0b', emoji: '🌅/🏰' },
    { key: 'Euro', name: 'Sesi Eropa (London)', time: '16:00 - 19:00 WIB', color: '#3b82f6', emoji: '🏰' },
    { key: 'Euro/NY', name: 'Overlap Euro/NY', time: '19:00 - 23:00 WIB', color: '#8b5cf6', emoji: '🎆' },
    { key: 'NY', name: 'Sesi New York', time: '23:00 - 04:00 WIB', color: '#10b981', emoji: '🗽' },
    { key: 'Off-Market', name: 'Off-Market / Lainnya', time: '04:00 - 07:00 WIB', color: '#64748b', emoji: '🌙' }
  ], []);

  // Compile detailed session stats
  const sessionStats = useMemo(() => {
    // Initial maps
    const map: Record<string, {
      key: string;
      name: string;
      time: string;
      color: string;
      emoji: string;
      totalTriggers: number;
      confirmedTriggers: number;
      skippedTriggers: number;
      totalTrades: number;
      wins: number;
      losses: number;
      profit: number;
      grossProfit: number;
      grossLoss: number;
      ringSum: number;
      ringCount: number;
      bodySum: number;
      bodyCount: number;
      volumeSum: number;
      volumeCount: number;
    }> = {};

    sessionsDef.forEach(s => {
      map[s.key] = {
        ...s,
        totalTriggers: 0,
        confirmedTriggers: 0,
        skippedTriggers: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        profit: 0,
        grossProfit: 0,
        grossLoss: 0,
        ringSum: 0,
        ringCount: 0,
        bodySum: 0,
        bodyCount: 0,
        volumeSum: 0,
        volumeCount: 0
      };
    });

    // 1. Process all signals to get Triggers & Volatility Characteristics
    signals.forEach(sig => {
      const sGroup = getSessionGroup(sig);
      if (!map[sGroup]) return;

      const target = map[sGroup];
      target.totalTriggers += 1;
      if (sig.is_confirmed) {
        target.confirmedTriggers += 1;
      } else {
        target.skippedTriggers += 1;
      }

      // Volatility calculations (using curr_high, curr_low, etc. if available)
      const high = sig.curr_high ?? sig.curr_open ?? 0;
      const low = sig.curr_low ?? sig.curr_open ?? 0;
      const open = sig.curr_open ?? 0;
      const close = sig.curr_close ?? 0;

      if (high > 0 && low > 0) {
        const diff = high - low;
        const bodyDiff = Math.abs(close - open);
        const mult = getPointMultiplier(sig.symbol, open);
        
        const ringPoints = Math.round(diff / mult);
        const bodyPoints = Math.round(bodyDiff / mult);

        target.ringSum += ringPoints;
        target.ringCount += 1;
        target.bodySum += bodyPoints;
        target.bodyCount += 1;

        if (sig.volume) {
          target.volumeSum += sig.volume;
          target.volumeCount += 1;
        }
      }
    });

    // 2. Process all executed trades to get Win/Loss, Profits & Overlap performance
    trades.forEach(trade => {
      const sGroup = getSessionGroup(trade);
      if (!map[sGroup]) return;

      const target = map[sGroup];
      target.totalTrades += 1;

      const pVal = trade.profit || 0;
      target.profit += pVal;
      if (trade.result === 'PROFIT') {
        target.wins += 1;
        target.grossProfit += pVal;
      } else {
        target.losses += 1;
        target.grossLoss += pVal;
      }

      // If signals didn't populate volatility, try parsing from trades if it has deep analytics
      if (target.ringCount === 0 && trade.curr_high && trade.curr_low) {
        const high = trade.curr_high;
        const low = trade.curr_low;
        const open = trade.curr_open ?? 0;
        const close = trade.curr_close ?? 0;
        const diff = high - low;
        const bodyDiff = Math.abs(close - open);
        const mult = getPointMultiplier(trade.symbol, open);
        
        target.ringSum += Math.round(diff / mult);
        target.ringCount += 1;
        target.bodySum += Math.round(bodyDiff / mult);
        target.bodyCount += 1;

        if (trade.signal_volume) {
          target.volumeSum += trade.signal_volume;
          target.volumeCount += 1;
        }
      }
    });

    // Final mapping and percentage calculations
    return Object.values(map).map(s => {
      const avgRing = s.ringCount > 0 ? Math.round(s.ringSum / s.ringCount) : 0;
      const avgBody = s.bodyCount > 0 ? Math.round(s.bodySum / s.bodyCount) : 0;
      const avgVolume = s.volumeCount > 0 ? Math.round(s.volumeSum / s.volumeCount) : 0;
      const winRate = s.totalTrades > 0 ? (s.wins / s.totalTrades) * 100 : 0;
      const growth = (s.profit / capital) * 100;
      const confirmationRate = s.totalTriggers > 0 ? (s.confirmedTriggers / s.totalTriggers) * 100 : 0;

      return {
        ...s,
        avgRing,
        avgBody,
        avgVolume,
        winRate,
        growth,
        confirmationRate
      };
    });
  }, [trades, signals, capital, sessionsDef]);

  const totalTradesCount = useMemo(() => trades.length, [trades]);

  if (totalTradesCount === 0 && signals.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Tidak ada data sesi trading tersedia untuk periode ini.
      </div>
    );
  }

  // Find best performing session
  const bestSession = [...sessionStats]
    .filter(s => s.totalTrades > 0)
    .sort((a, b) => b.profit - a.profit)[0];

  return (
    <div className="space-y-8 mt-4">
      {/* Configuration & Header Utilities */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur-md">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="text-primary" size={16} />
            Pengaturan Modal Portofolio
          </h4>
          <p className="text-xs text-slate-400">Masukkan modal awal akun untuk menghitung kontribusi persentase profit per sesi.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 w-full md:w-auto">
          <DollarSign size={16} className="text-slate-400" />
          <input
            type="number"
            value={capitalInput}
            onChange={(e) => handleCapitalChange(e.target.value)}
            placeholder="Capital/Modal"
            className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none w-28"
          />
          <span className="text-xs text-slate-500 border-l border-slate-800 pl-2">Capital (USD)</span>
        </div>
      </div>

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessionStats.map((sess) => {
          const isProfitable = sess.profit >= 0;
          return (
            <div 
              key={sess.key} 
              className="relative bg-surface rounded-xl p-5 border border-white/5 shadow-xl overflow-hidden group hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Backglow using session color */}
              <div 
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-opacity duration-500"
                style={{ backgroundColor: sess.color }}
              />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sess.emoji}</span>
                      <h3 className="font-bold text-white text-base leading-tight">{sess.name}</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">{sess.time}</span>
                  </div>
                  <span 
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                    style={{ color: sess.color, borderColor: `${sess.color}25`, backgroundColor: `${sess.color}10` }}
                  >
                    WIB
                  </span>
                </div>

                {/* Profit/Loss Display */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={`text-2xl font-black tracking-tight ${isProfitable ? 'text-success' : 'text-danger'}`}>
                    {sess.profit >= 0 ? '+' : ''}${formatNumber(sess.profit, 2)}
                  </span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isProfitable ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {sess.profit >= 0 ? '+' : ''}{formatNumber(sess.growth, 2)}%
                  </span>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">Win Rate</span>
                    <span className="text-sm font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Target size={14} className={sess.winRate >= 50 ? 'text-success' : 'text-danger'} />
                      {formatNumber(sess.winRate)}% 
                      <span className="text-xs text-slate-500 font-normal">({sess.wins}/{sess.totalTrades})</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">Trigger Scanner</span>
                    <span className="text-sm font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                      <Activity size={14} className="text-slate-400" />
                      {sess.totalTriggers} <span className="text-[10px] text-slate-500 font-normal">({sess.confirmedTriggers} OP)</span>
                    </span>
                  </div>
                </div>

                {/* Candle details: Ring and Body sizes */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">Rata² Ring (Full)</span>
                    <span className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                      {sess.avgRing > 0 ? `${sess.avgRing} pts` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">Rata² Body Size</span>
                    <span className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                      {sess.avgBody > 0 ? `${sess.avgBody} pts` : '-'}
                    </span>
                  </div>
                </div>

                {/* Optional tick volume */}
                {sess.avgVolume > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider">Rata² Tick Volume</span>
                    <span className="text-xs font-mono font-semibold text-slate-400 mt-0.5 block">
                      {sess.avgVolume.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar helper visual */}
              <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(Math.max(sess.winRate, 5), 100)}%`,
                    backgroundColor: sess.winRate >= 50 ? '#10b981' : '#f43f5e'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Highlights & Optimization Suggestion */}
      {bestSession && bestSession.profit > 0 && (
        <div className="bg-success/5 border border-success/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10 text-success">
            <Flame size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Sesi Terbaik Saat Ini: {bestSession.name} ({bestSession.emoji})</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Dengan profit bersih <strong className="text-success">${formatNumber(bestSession.profit, 2)}</strong> (+{formatNumber(bestSession.growth, 2)}% dari modal), 
              sesi ini menunjukkan kinerja tertinggi dengan tingkat kemenangan <strong className="text-white">{formatNumber(bestSession.winRate)}%</strong>. 
              Pertimbangkan untuk mengoptimalkan parameter/ukuran lot khusus pada jam overlap atau sesi aktif ini.
            </p>
          </div>
        </div>
      )}

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Triggers vs Executed (Stacked Bar) */}
        <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Percent size={18} className="text-primary" />
                Rasio Filter & Eksekusi Sinyal per Sesi
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Melihat seberapa banyak trigger engulfing yang terdeteksi vs yang berhasil lolos filter menjadi OP.</p>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="key" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="skippedTriggers" name="Sinyal Dilewati (Skipped)" stackId="a" fill="#475569" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="confirmedTriggers" name="Sinyal Eksekusi (OP)" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Volatility Comparison (Avg Ring vs Avg Body) */}
        <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 space-y-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Globe size={18} className="text-primary" />
                Karakteristik Volatilitas Candle per Sesi
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Membandingkan tinggi lilin rata-rata (Ring) dan ukuran body candle engulfing dalam Points.</p>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionStats} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="key" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val} pts`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(val) => [`${val} points`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="avgRing" name="Rata-rata Ring (Tinggi)" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="avgRing" 
                      position="top" 
                      formatter={(val: any) => typeof val === 'number' && val > 0 ? `${val} pts` : val || ''} 
                      style={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} 
                    />
                  </Bar>
                  <Bar dataKey="avgBody" name="Rata-rata Body Size" fill="#fbbf24" radius={[4, 4, 0, 0]}>
                    <LabelList 
                      dataKey="avgBody" 
                      position="top" 
                      formatter={(val: any) => typeof val === 'number' && val > 0 ? `${val} pts` : val || ''} 
                      style={{ fill: '#fbbf24', fontSize: 10, fontWeight: 600 }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-white">Matriks Komparasi Performa Sesi</h4>
            <p className="text-xs text-slate-400 mt-0.5">Tabel rincian komparasi performa trading di setiap sesi secara lengkap.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-900/40 text-slate-400 font-medium text-xs border-b border-white/5 uppercase tracking-wider">
                <th className="py-3 px-4">Sesi Pasar</th>
                <th className="py-3 px-3 text-center">Trigger Scanner</th>
                <th className="py-3 px-3 text-center">Lolos Filter</th>
                <th className="py-3 px-3 text-center">OP Executed</th>
                <th className="py-3 px-3 text-center">OP Win / Loss</th>
                <th className="py-3 px-3 text-center">Win Rate (%)</th>
                <th className="py-3 px-3 text-right">Avg Ring / Body</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessionStats.map((sess) => (
                <tr key={sess.key} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">
                    <span className="mr-2">{sess.emoji}</span>
                    {sess.name}
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5 font-normal">{sess.time}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono">{sess.totalTriggers}</td>
                  <td className="py-3 px-3 text-center font-mono text-purple-400">{formatNumber(sess.confirmationRate)}%</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">{sess.totalTrades}</td>
                  <td className="py-3 px-3 text-center font-mono text-xs">
                    <span className="text-success">{sess.wins}W</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-danger">{sess.losses}L</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span className={sess.winRate >= 50 ? 'text-success' : 'text-danger'}>
                      {sess.totalTrades > 0 ? `${formatNumber(sess.winRate)}%` : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-slate-400">
                    <div>{sess.avgRing > 0 ? `${sess.avgRing} pts` : '-'}</div>
                    <div className="text-[10px] text-slate-600">Body: {sess.avgBody > 0 ? `${sess.avgBody} pts` : '-'}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    <div className={sess.profit >= 0 ? 'text-success' : 'text-danger'}>
                      {sess.profit >= 0 ? '+' : ''}${formatNumber(sess.profit, 2)}
                    </div>
                    <div className={`text-[10px] font-medium ${sess.profit >= 0 ? 'text-success/70' : 'text-danger/70'}`}>
                      {sess.profit >= 0 ? '+' : ''}{formatNumber(sess.growth, 2)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
