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
