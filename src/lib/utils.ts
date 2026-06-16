import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TradeAnalytics, DashboardStats } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDashboardStats(trades: TradeAnalytics[]): DashboardStats {
  const stats: DashboardStats = trades.reduce(
    (acc, trade) => {
      acc.totalTrades++;
      
      const profit = trade.profit || 0;
      acc.netProfit += profit;

      if (trade.result === 'PROFIT') {
        acc.totalProfit += profit;
      } else if (trade.result === 'LOSS') {
        acc.totalLoss += profit; // Loss is negative, so adding it keeps it negative
      }

      return acc;
    },
    { totalTrades: 0, winRate: 0, totalProfit: 0, totalLoss: 0, netProfit: 0 }
  );

  const wins = trades.filter((t) => t.result === 'PROFIT').length;
  stats.winRate = stats.totalTrades > 0 ? (wins / stats.totalTrades) * 100 : 0;

  return stats;
}

export const getSessionFromTime = (timeStr: string): string => {
  const date = new Date(timeStr);
  const wibHour = (date.getUTCHours() + 7) % 24;
  
  if (wibHour >= 7 && wibHour < 14) return 'Asia';
  if (wibHour >= 14 && wibHour < 16) return 'Asia/Euro';
  if (wibHour >= 16 && wibHour < 19) return 'Euro';
  if (wibHour >= 19 && wibHour < 23) return 'Euro/NY';
  if (wibHour >= 23 || wibHour < 4) return 'NY';
  return 'Off-Market';
};

export const getSessionGroup = (item: { 
  trading_session?: string | null; 
  entry_time?: string | null; 
  trade_created_at?: string; 
  created_at?: string; 
  signal_time?: string 
} | string | null | undefined): string => {
  if (!item) return 'Off-Market';
  
  let session: string | null | undefined;
  if (typeof item === 'string') {
    session = item;
  } else {
    session = item.trading_session;
    if (!session || session === 'Unknown') {
      const timeStr = item.entry_time || item.trade_created_at || item.created_at || item.signal_time;
      if (timeStr) {
        session = getSessionFromTime(timeStr);
      } else {
        session = 'Off-Market';
      }
    }
  }
  
  const s = session.toLowerCase();
  if (s.includes('asia') && (s.includes('euro') || s.includes('london'))) return 'Asia/Euro';
  if (s.includes('euro') && (s.includes('ny') || s.includes('york'))) return 'Euro/NY';
  if (s.includes('london') && (s.includes('ny') || s.includes('york'))) return 'Euro/NY';
  if (s.includes('asia')) return 'Asia';
  if (s.includes('euro') || s.includes('london')) return 'Euro';
  if (s.includes('ny') || s.includes('york')) return 'NY';
  return 'Off-Market';
};
