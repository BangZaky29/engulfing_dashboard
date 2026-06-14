export interface TradeAnalytics {
  trade_id: number;
  ticket_id: number;
  symbol: string;
  timeframe: string;
  mode: 'BUY' | 'SELL';
  result: 'PROFIT' | 'LOSS';
  op_price: number | null;
  sl_price: number | null;
  tp_price: number | null;
  profit: number | null;
  entry_time: string | null;
  exit_time: string | null;
  image_url: string;
  trade_created_at: string;
  // New deep analytics fields from View
  pattern_type?: string;
  engulf_ratio?: number;
  ema_trend?: string;
  confidence_score?: number;
  signal_time?: string;
  notes?: string;
}

export interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
}
