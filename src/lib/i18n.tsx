import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'id';

const translations = {
  en: {
    appTitle: 'Engulfing Analytics',
    appSubtitle: 'Real-time MT5 trading performance dashboard.',
    allTime: 'All Time',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    refresh: 'Refresh',
    totalTrades: 'Total Trades',
    winRate: 'Win Rate',
    totalProfit: 'Total Profit',
    netProfit: 'Net Profit',
    overview: 'Overview',
    deepAnalytics: 'Deep Analytics',
    recentTrades: 'Recent Trades',
    hourlyWinRateTitle: 'Hourly Win Rate Analysis',
    hourlyWinRateDesc: 'Discover the best trading hours with highest win probability.',
    patternRatioTitle: 'Engulf Ratio vs Profit',
    patternRatioDesc: 'Analyze how candle size multiplier affects trade profitability.',
    optimizationTips: '💡 Trading Optimization Tips',
    tip1: 'Look at the Hourly Win Rate Analysis to identify "dead zones" (hours with sub-50% win rate). Consider pausing the bot during these hours.',
    tip2: 'Analyze the Engulf Ratio vs Profit scatter plot. If massive engulfing candles (Ratio > 3.0x) mostly result in losses, you should lower your max ratio limit.',
    tip3: 'Ensure you are using the correct global time filter (top right) to isolate specific market conditions.',
    good: 'Good',
    needsImprovement: 'Needs Improvement',
    profitable: 'Profitable',
    loss: 'Loss',
    filters: 'Filters:',
    allModes: 'All Modes',
    allResults: 'All Results',
    allSymbols: 'All Symbols',
    time: 'Time',
    symbol: 'Symbol',
    mode: 'Mode',
    result: 'Result',
    profit: 'Profit',
    entryExit: 'Entry - Exit',
    chart: 'Chart',
    noTrades: 'No trades match the selected filters.',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    to: 'to',
    results: 'results',
    waManagerTitle: 'WhatsApp Bot Status',
    deviceConnected: 'Device Connected',
    deviceDisconnected: 'Scan to Connect',
    botActiveDesc: 'The bot is active and ready to send trade signals to the group.',
    scanQRDesc: 'Open WhatsApp on your phone, go to Linked Devices, and scan this QR Code.',
    logoutDevice: 'Logout Device',
    connecting: 'Connecting...',
    chartCumulativeProfit: 'Cumulative Profit Performance',
    notEnoughData: 'Not enough data to display chart.',
    winRateAxis: 'Win Rate',
    wins: 'Wins',
    losses: 'Losses',
    patternClusters: 'Pattern Shape Clusters',
    patternClustersDesc: 'Grouping trades by engulfing ratio to identify the most reliable shapes.',
    viewGallery: 'View Gallery',
    closeGallery: 'Close',
    images: 'Images',
    polaA: 'Type A (Monster)',
    polaADesc: 'Ratio ≥ 2.5x. Massive engulfing.',
    polaB: 'Type B (Solid)',
    polaBDesc: 'Ratio 1.8x - 2.5x. Ideal engulfing.',
    polaC: 'Type C (Standard)',
    polaCDesc: 'Ratio 1.4x - 1.8x. Standard shape.',
    polaD: 'Type D (Weak)',
    polaDDesc: 'Ratio < 1.4x. Marginal engulfing.',
    win: 'Win',
    trades: 'Trades',
    timeFrom: 'From',
    timeTo: 'To',
    filterSummary: 'Filter Summary',
    activeFilters: 'Active Filters',
    totalTradesLabel: 'Total Trades',
    profitLabel: 'Profit',
    lossLabel: 'Loss',
    winRateLabel: 'Win Rate',
    netProfitLabel: 'Net Profit',
    timeRange: 'Time Range',
    clearTime: 'Clear Time',
  },
  id: {
    appTitle: 'Analitik Engulfing',
    appSubtitle: 'Dashboard performa trading MT5 real-time.',
    allTime: 'Semua Waktu',
    today: 'Hari Ini',
    thisWeek: 'Minggu Ini',
    thisMonth: 'Bulan Ini',
    thisYear: 'Tahun Ini',
    refresh: 'Segarkan',
    totalTrades: 'Total Trading',
    winRate: 'Akurasi (Win Rate)',
    totalProfit: 'Total Keuntungan',
    netProfit: 'Keuntungan Bersih',
    overview: 'Ringkasan',
    deepAnalytics: 'Analisa Mendalam',
    recentTrades: 'Riwayat Trading',
    hourlyWinRateTitle: 'Analisa Win Rate per Jam',
    hourlyWinRateDesc: 'Temukan jam trading terbaik dengan probabilitas profit tertinggi.',
    patternRatioTitle: 'Rasio Engulfing vs Profit',
    patternRatioDesc: 'Analisa bagaimana ukuran candle mempengaruhi keuntungan.',
    optimizationTips: '💡 Tips Optimasi Trading',
    tip1: 'Lihat Analisa Win Rate per Jam untuk mencari "zona mati" (jam dengan win rate di bawah 50%). Pertimbangkan untuk mematikan bot pada jam-jam tersebut.',
    tip2: 'Analisa grafik sebaran Rasio Engulfing. Jika candle engulfing raksasa (Rasio > 3.0x) lebih sering berujung loss, Anda harus menurunkan batas maksimal rasio.',
    tip3: 'Pastikan Anda menggunakan filter waktu (kanan atas) yang benar untuk mengisolasi kondisi pasar tertentu.',
    good: 'Bagus',
    needsImprovement: 'Perlu Ditingkatkan',
    profitable: 'Profit',
    loss: 'Rugi',
    filters: 'Filter:',
    allModes: 'Semua Mode',
    allResults: 'Semua Hasil',
    allSymbols: 'Semua Simbol',
    time: 'Waktu',
    symbol: 'Simbol',
    mode: 'Mode',
    result: 'Hasil',
    profit: 'Profit',
    entryExit: 'Entry - Exit',
    chart: 'Grafik',
    noTrades: 'Tidak ada data yang cocok dengan filter.',
    previous: 'Sebelumnya',
    next: 'Selanjutnya',
    page: 'Halaman',
    of: 'dari',
    showing: 'Menampilkan',
    to: 'sampai',
    results: 'data',
    waManagerTitle: 'Status Bot WhatsApp',
    deviceConnected: 'Perangkat Terhubung',
    deviceDisconnected: 'Scan untuk Hubungkan',
    botActiveDesc: 'Bot aktif dan siap mengirim sinyal trading ke grup.',
    scanQRDesc: 'Buka WhatsApp di HP Anda, masuk ke Perangkat Tertaut, dan scan QR Code ini.',
    logoutDevice: 'Keluar Perangkat',
    connecting: 'Menghubungkan...',
    chartCumulativeProfit: 'Grafik Kumulatif Profit',
    notEnoughData: 'Data tidak cukup untuk menampilkan grafik.',
    winRateAxis: 'Akurasi',
    wins: 'Menang',
    losses: 'Kalah',
    patternClusters: 'Pengelompokan Bentuk Pola',
    patternClustersDesc: 'Mengelompokkan transaksi berdasarkan ukuran engulfing untuk mencari bentuk paling akurat.',
    viewGallery: 'Lihat Galeri',
    closeGallery: 'Tutup',
    images: 'Gambar',
    polaA: 'Pola A (Raksasa)',
    polaADesc: 'Rasio ≥ 2.5x. Engulfing sangat besar.',
    polaB: 'Pola B (Solid)',
    polaBDesc: 'Rasio 1.8x - 2.5x. Engulfing ideal.',
    polaC: 'Pola C (Standar)',
    polaCDesc: 'Rasio 1.4x - 1.8x. Bentuk standar.',
    polaD: 'Pola D (Lemah)',
    polaDDesc: 'Rasio < 1.4x. Engulfing sangat tipis.',
    win: 'Menang',
    trades: 'Trading',
    timeFrom: 'Dari Jam',
    timeTo: 'Sampai',
    filterSummary: 'Ringkasan Filter',
    activeFilters: 'Filter Aktif',
    totalTradesLabel: 'Total Trade',
    profitLabel: 'Profit',
    lossLabel: 'Loss',
    winRateLabel: 'Win Rate',
    netProfitLabel: 'Net Profit',
    timeRange: 'Rentang Jam',
    clearTime: 'Hapus Jam',
  }
};

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Try to load language from localStorage, default to 'id'
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'en' || saved === 'id') ? saved : 'id';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
