import { useState, useMemo } from 'react';
import { useTradeData } from './hooks/useTradeData';
import { StatCard } from './components/StatCard';
import { PerformanceChart } from './components/PerformanceChart';
import { TradesTable } from './components/TradesTable';
import { WhatsAppManager } from './components/WhatsAppManager';
import { HourlyWinRateChart } from './components/analytics/HourlyWinRateChart';
import { PatternAnalysisChart } from './components/analytics/PatternAnalysisChart';
import { PatternClusterAnalysis } from './components/analytics/PatternClusterAnalysis';
import { GradeAnalysisChart } from './components/analytics/GradeAnalysisChart';
import { SignalFunnelChart } from './components/analytics/SignalFunnelChart';
import { HoldingTimeChart } from './components/analytics/HoldingTimeChart';
import { ReportGallery } from './components/analytics/ReportGallery';
import { ImageModal } from './components/ImageModal';
import { SignalsTable } from './components/SignalsTable';
import { Activity, TrendingUp, DollarSign, Target, RefreshCw, Calendar, BarChart3, ScatterChart as ScatterIcon, LayoutDashboard, Globe, Award, FileText, Clock as ClockIcon, Filter as FilterIcon } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { calculateDashboardStats } from './lib/utils';
import { useLanguage } from './lib/i18n';
import { useSignalData } from './hooks/useSignalData';

export type TimeFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';
type Tab = 'OVERVIEW' | 'SIGNALS' | 'DEEP_ANALYTICS' | 'REPORTS';

function App() {
  const { t, language, setLanguage } = useLanguage();
  const { trades, loading, error, refetch } = useTradeData();
  const { signals } = useSignalData();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');

  // Filter trades based on global time filter
  const timeFilteredTrades = useMemo(() => {
    if (timeFilter === 'ALL') return trades;

    return trades.filter((trade) => {
      const tradeDate = new Date(trade.trade_created_at);
      switch (timeFilter) {
        case 'TODAY':
          return isToday(tradeDate);
        case 'WEEK':
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
              {t('appTitle')}
            </h1>
            <p className="text-muted mt-1">{t('appSubtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors text-sm text-slate-300 font-medium"
            >
              <Globe size={16} />
              {language === 'en' ? 'ID' : 'EN'}
            </button>
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
                <option value="ALL">{t('allTime')}</option>
                <option value="TODAY">{t('today')}</option>
                <option value="WEEK">{t('thisWeek')}</option>
                <option value="MONTH">{t('thisMonth')}</option>
                <option value="YEAR">{t('thisYear')}</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch(true)}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 flex-1 md:flex-none"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="hidden md:inline">{t('refresh')}</span>
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
            title={t('totalTrades')}
            value={currentStats.totalTrades}
            icon={<Activity size={24} />}
          />
          <StatCard
            title={t('winRate')}
            value={`${currentStats.winRate.toFixed(1)}%`}
            icon={<Target size={24} />}
            trend={currentStats.totalTrades === 0 ? undefined : currentStats.winRate >= 50 ? t('good') : t('needsImprovement')}
            trendUp={currentStats.winRate >= 50}
          />
          <StatCard
            title={t('totalProfit')}
            value={`$${currentStats.totalProfit.toFixed(2)}`}
            icon={<TrendingUp size={24} className="text-success" />}
            className="border-success/20"
          />
          <StatCard
            title={t('netProfit')}
            value={`$${currentStats.netProfit.toFixed(2)}`}
            icon={<DollarSign size={24} className={currentStats.netProfit >= 0 ? "text-success" : "text-danger"} />}
            trend={currentStats.totalTrades === 0 ? undefined : currentStats.netProfit >= 0 ? t('profitable') : t('loss')}
            trendUp={currentStats.netProfit >= 0}
            className={currentStats.netProfit >= 0 ? "border-success/20" : "border-danger/20"}
          />
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-slate-800">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`${activeTab === 'OVERVIEW'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <LayoutDashboard size={18} />
              {t('overview')}
            </button>
            <button
              onClick={() => setActiveTab('SIGNALS')}
              className={`${activeTab === 'SIGNALS'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <Activity size={18} />
              Riwayat Trigger
            </button>
            <button
              onClick={() => setActiveTab('DEEP_ANALYTICS')}
              className={`${activeTab === 'DEEP_ANALYTICS'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <BarChart3 size={18} />
              {t('deepAnalytics')}
            </button>
            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`${activeTab === 'REPORTS'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <FileText size={18} />
              Arsip Laporan
            </button>
          </nav>
        </div>

        {/* Tab Content: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PerformanceChart trades={timeFilteredTrades} />
              </div>
              <div>
                <WhatsAppManager />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">{t('recentTrades')}</h3>
              <TradesTable trades={timeFilteredTrades} onImageClick={setSelectedImage} />
            </div>
          </div>
        )}

        {/* Tab Content: SIGNALS */}
        {activeTab === 'SIGNALS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Riwayat Trigger & Sinyal</h2>
              <p className="text-slate-400">Daftar lengkap seluruh trigger engulfing yang dideteksi scanner, baik yang dieksekusi maupun yang dibatalkan (dilewati) oleh filter.</p>
            </div>
            <SignalsTable signals={signals} />
          </div>
        )}

        {/* Tab Content: DEEP ANALYTICS */}
        {activeTab === 'DEEP_ANALYTICS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Win Rate */}
              <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-white">{t('hourlyWinRateTitle')}</h2>
                  </div>
                  <p className="text-sm text-slate-400">{t('hourlyWinRateDesc')}</p>
                  <HourlyWinRateChart trades={timeFilteredTrades} />
                </div>
              </div>

              {/* Pattern Ratio vs Profit */}
              <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <ScatterIcon className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-white">{t('patternRatioTitle')}</h2>
                  </div>
                  <p className="text-sm text-slate-400">{t('patternRatioDesc')}</p>
                  <PatternAnalysisChart trades={timeFilteredTrades} />
                </div>
              </div>
            </div>

            {/* Grade Analysis */}
            <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="text-primary" size={20} />
                  <h2 className="text-lg font-semibold text-white">Analisa Performa berdasarkan Grade</h2>
                </div>
                <p className="text-sm text-slate-400">Distribusi persentase kemenangan (Win Rate) dan total keuntungan bersih untuk masing-masing kelompok Grade.</p>
                <GradeAnalysisChart trades={timeFilteredTrades} />
              </div>
            </div>

            {/* New Grid for Funnel and Holding Time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Signal Funnel */}
              <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <FilterIcon className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-white">Sinyal vs Eksekusi (Funnel)</h2>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Menganalisa seberapa ketat filter bot menyaring sinyal mentah MT5 menjadi eksekusi OP.</p>
                  <div className="flex-1 flex items-center justify-center">
                    <SignalFunnelChart trades={timeFilteredTrades} signals={signals} />
                  </div>
                </div>
              </div>

              {/* Holding Time */}
              <div className="bg-surface rounded-xl p-6 border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className="text-primary" size={20} />
                    <h2 className="text-lg font-semibold text-white">Analisa Waktu Tahan (Holding Time)</h2>
                  </div>
                  <p className="text-sm text-slate-400">Distribusi durasi floating (dari OP sampai Close) dibandingkan dengan hasil Profit/Loss.</p>
                  <HoldingTimeChart trades={timeFilteredTrades} />
                </div>
              </div>
            </div>

            {/* Pattern Clustering Gallery */}
            <PatternClusterAnalysis trades={timeFilteredTrades} />
            
            {/* Note about EMA / Confidence */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-md font-semibold text-white mb-2">{t('optimizationTips')}</h3>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
                <li>{t('tip1')}</li>
                <li>{t('tip2')}</li>
                <li>{t('tip3')}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab Content: REPORTS */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Arsip Laporan PDF</h2>
              <p className="text-slate-400">Daftar seluruh laporan rekapitulasi trading yang dihasilkan oleh sistem secara otomatis.</p>
            </div>
            <ReportGallery />
          </div>
        )}

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
