import { useState, useMemo } from 'react';
import { useTradeData } from './hooks/useTradeData';
import { StatCard } from './components/StatCard';
import { PerformanceChart } from './components/PerformanceChart';
import { TradesTable } from './components/TradesTable';
import { ImageModal } from './components/ImageModal';
import { Activity, TrendingUp, DollarSign, Target, RefreshCw, Calendar } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { calculateDashboardStats } from './lib/utils';

export type TimeFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';

function App() {
  const { trades, loading, error, refetch } = useTradeData();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');

  // Filter trades based on global time filter
  const timeFilteredTrades = useMemo(() => {
    if (timeFilter === 'ALL') return trades;

    return trades.filter((trade) => {
      const tradeDate = new Date(trade.created_at);
      switch (timeFilter) {
        case 'TODAY':
          return isToday(tradeDate);
        case 'WEEK':
          // date-fns isThisWeek uses local start of week (Sunday/Monday based on locale).
          // We'll use the default which is generally Sunday.
          return isThisWeek(tradeDate);
        case 'MONTH':
          return isThisMonth(tradeDate);
        case 'YEAR':
          return isThisYear(tradeDate);
        default:
          return true;
      }
    });
  }, [trades, timeFilter]);

  // Calculate stats based on the filtered trades
  const currentStats = useMemo(() => calculateDashboardStats(timeFilteredTrades), [timeFilteredTrades]);

  return (
    <div className="min-h-screen bg-background text-text p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Global Filters */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="text-primary" />
              Engulfing Analytics
            </h1>
            <p className="text-muted mt-1">Real-time MT5 trading performance dashboard.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Global Time Filter Dropdown */}
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-1 flex-1 md:flex-none">
              <div className="pl-2 pr-1 text-muted hidden md:block">
                <Calendar size={16} />
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className="bg-transparent text-sm w-full md:w-auto px-2 py-1.5 text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
                <option value="YEAR">This Year</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch(true)}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 flex-1 md:flex-none"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-lg">
            Error loading data: {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Trades"
            value={currentStats.totalTrades}
            icon={<Activity size={24} />}
          />
          <StatCard
            title="Win Rate"
            value={`${currentStats.winRate.toFixed(1)}%`}
            icon={<Target size={24} />}
            trend={currentStats.totalTrades === 0 ? undefined : currentStats.winRate >= 50 ? 'Good' : 'Needs Improvement'}
            trendUp={currentStats.winRate >= 50}
          />
          <StatCard
            title="Total Profit"
            value={`$${currentStats.totalProfit.toFixed(2)}`}
            icon={<TrendingUp size={24} className="text-success" />}
            className="border-success/20"
          />
          <StatCard
            title="Net Profit"
            value={`$${currentStats.netProfit.toFixed(2)}`}
            icon={<DollarSign size={24} className={currentStats.netProfit >= 0 ? "text-success" : "text-danger"} />}
            trend={currentStats.totalTrades === 0 ? undefined : currentStats.netProfit >= 0 ? 'Profitable' : 'Loss'}
            trendUp={currentStats.netProfit >= 0}
            className={currentStats.netProfit >= 0 ? "border-success/20" : "border-danger/20"}
          />
        </div>

        {/* Chart */}
        <PerformanceChart trades={timeFilteredTrades} />

        {/* Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Recent Trades</h3>
          <TradesTable trades={timeFilteredTrades} onImageClick={setSelectedImage} />
        </div>
      </div>

      <ImageModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}

export default App;
