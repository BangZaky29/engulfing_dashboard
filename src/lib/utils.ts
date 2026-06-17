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

export function isUsDst(date: Date): boolean {
  const year = date.getUTCFullYear();
  const march1 = new Date(Date.UTC(year, 2, 1));
  const wMarch1 = march1.getUTCDay();
  const firstSunMarch = 1 + (7 - wMarch1) % 7;
  const dstStart = new Date(Date.UTC(year, 2, firstSunMarch + 7, 2, 0, 0));
  
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const wNov1 = nov1.getUTCDay();
  const firstSunNov = 1 + (7 - wNov1) % 7;
  const dstEnd = new Date(Date.UTC(year, 10, firstSunNov, 2, 0, 0));
  
  const time = date.getTime();
  return time >= dstStart.getTime() && time < dstEnd.getTime();
}

export const getSummerFlag = (dstMode: 'auto' | 'summer' | 'winter', date: Date = new Date()): boolean => {
  if (dstMode === 'summer') return true;
  if (dstMode === 'winter') return false;
  return isUsDst(date);
};

export const getSessionFromTime = (timeStr: string, dstMode: 'auto' | 'summer' | 'winter' = 'auto'): string => {
  const date = new Date(timeStr);
  const wibHour = (date.getUTCHours() + 7) % 24;
  
  const isSummer = getSummerFlag(dstMode, date);
  
  if (isSummer) {
    // Summer/DST
    if (wibHour >= 7 && wibHour < 14) return 'Asia Only';
    if (wibHour >= 14 && wibHour < 16) return 'Asia x Europe Overlap';
    if (wibHour >= 16 && wibHour < 19) return 'Europe Only';
    if (wibHour >= 19 && wibHour < 23) return 'Europe x New York Overlap';
    if (wibHour >= 23 || wibHour < 4) return 'New York Only';
    return 'Off / Low Liquidity';
  } else {
    // Winter/Non-DST
    if (wibHour >= 7 && wibHour < 15) return 'Asia Only';
    if (wibHour >= 15 && wibHour < 16) return 'Asia x Europe Overlap';
    if (wibHour >= 16 && wibHour < 20) return 'Europe Only';
    if (wibHour >= 20 && wibHour < 24) return 'Europe x New York Overlap';
    if (wibHour >= 0 && wibHour < 5) return 'New York Only';
    return 'Off / Low Liquidity';
  }
};

export const getSessionGroup = (item: { 
  trading_session?: string | null; 
  entry_time?: string | null; 
  trade_created_at?: string; 
  created_at?: string; 
  signal_time?: string 
} | string | null | undefined, dstMode: 'auto' | 'summer' | 'winter' = 'auto'): string => {
  if (!item) return 'Off / Low Liquidity';
  
  let session: string | null | undefined;
  let timeStr: string | null | undefined;
  
  if (typeof item === 'string') {
    session = item;
  } else {
    session = item.trading_session;
    timeStr = item.entry_time || item.trade_created_at || item.created_at || item.signal_time;
  }
  
  if (!session || session === 'Unknown') {
    if (timeStr) {
      session = getSessionFromTime(timeStr, dstMode);
    } else {
      session = 'Off / Low Liquidity';
    }
  }
  
  const s = session.toLowerCase();
  
  // Overlaps
  if (
    (s.includes('asia') && (s.includes('euro') || s.includes('london'))) || 
    s.includes('asia x europe overlap')
  ) {
    return 'Asia x Europe Overlap';
  }
  if (
    (s.includes('euro') && (s.includes('ny') || s.includes('york'))) || 
    (s.includes('london') && (s.includes('ny') || s.includes('york'))) ||
    s.includes('europe x new york overlap')
  ) {
    return 'Europe x New York Overlap';
  }
  
  // Single sessions
  if (s.includes('asia')) {
    return 'Asia Only';
  }
  if (s.includes('euro') || s.includes('london') || s.includes('europe')) {
    return 'Europe Only';
  }
  if (s.includes('ny') || s.includes('york') || s.includes('new york')) {
    return 'New York Only';
  }
  
  return 'Off / Low Liquidity';
};
