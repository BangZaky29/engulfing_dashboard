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
  trading_session?: string | null;
}

export interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
}

export interface ReportHistory {
  id: string;
  report_type: string;
  report_date: string;
  file_url: string;
  total_trades: number;
  win_rate: number;
  total_profit: number;
  created_at: string;
}

export interface EngulfingSignal {
  id: number;
  symbol: string;
  timeframe: string;
  signal_time: string;
  pattern_type: string;
  is_confirmed: boolean;
  skip_reason?: string | null;
  notes?: string;
  created_at: string;
  trading_session?: string | null;
}

export interface TradeActiveLog {
  id: number;
  ticket_id: number;
  symbol: string;
  mode: 'BUY' | 'SELL';
  message: string;
  op_price: number | null;
  sl_price: number | null;
  tp_price: number | null;
  created_at: string;
  trading_session: string | null;
}
