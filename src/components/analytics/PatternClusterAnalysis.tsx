import { useState, useMemo } from 'react';
import type { TradeAnalytics } from '../../types';
import { useLanguage } from '../../lib/i18n';
import { GalleryModal } from '../GalleryModal';
import { Images, Target, TrendingUp, Activity } from 'lucide-react';

interface PatternClusterAnalysisProps {
  trades: TradeAnalytics[];
}

export function PatternClusterAnalysis({ trades }: PatternClusterAnalysisProps) {
  const { t } = useLanguage();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryTitle, setGalleryTitle] = useState('');

  const clusters = useMemo(() => {
    const data = {
      polaA: { titleKey: 'polaA', descKey: 'polaADesc', trades: [] as TradeAnalytics[], minRatio: 2.5, maxRatio: Infinity },
      polaB: { titleKey: 'polaB', descKey: 'polaBDesc', trades: [] as TradeAnalytics[], minRatio: 1.8, maxRatio: 2.5 },
      polaC: { titleKey: 'polaC', descKey: 'polaCDesc', trades: [] as TradeAnalytics[], minRatio: 1.4, maxRatio: 1.8 },
      polaD: { titleKey: 'polaD', descKey: 'polaDDesc', trades: [] as TradeAnalytics[], minRatio: 0, maxRatio: 1.4 },
    };

    trades.forEach((trade) => {
      if (trade.engulf_ratio == null) return;
      const r = trade.engulf_ratio;
      
      if (r >= data.polaA.minRatio) data.polaA.trades.push(trade);
      else if (r >= data.polaB.minRatio && r < data.polaB.maxRatio) data.polaB.trades.push(trade);
      else if (r >= data.polaC.minRatio && r < data.polaC.maxRatio) data.polaC.trades.push(trade);
      else data.polaD.trades.push(trade);
    });

    return Object.values(data).map(cluster => {
      const total = cluster.trades.length;
      const wins = cluster.trades.filter(t => t.result === 'PROFIT').length;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const profit = cluster.trades.reduce((acc, t) => acc + (t.profit || 0), 0);
      const images = cluster.trades.map(t => t.image_url).filter(Boolean);

      return {
        ...cluster,
        total,
        winRate,
        profit,
        images
      };
    });
  }, [trades]);

  const handleOpenGallery = (images: string[], title: string) => {
    setGalleryImages(images);
    setGalleryTitle(title);
    setGalleryOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Images className="text-primary" size={24} />
        <div>
          <h2 className="text-xl font-semibold text-white">{t('patternClusters')}</h2>
          <p className="text-sm text-slate-400">{t('patternClustersDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white text-lg">{t(cluster.titleKey as any)}</h3>
                <p className="text-xs text-slate-400">{t(cluster.descKey as any)}</p>
              </div>
              <button
                onClick={() => handleOpenGallery(cluster.images, t(cluster.titleKey as any))}
                disabled={cluster.images.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Images size={16} />
                {t('viewGallery')} ({cluster.images.length})
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700/30">
                <div className="text-muted text-xs mb-1 flex items-center justify-center gap-1"><Target size={12} /> {t('winRate')}</div>
                <div className={`text-lg font-bold ${cluster.total === 0 ? 'text-slate-500' : cluster.winRate >= 50 ? 'text-success' : 'text-danger'}`}>
                  {cluster.winRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700/30">
                <div className="text-muted text-xs mb-1 flex items-center justify-center gap-1"><TrendingUp size={12} /> {t('profit')}</div>
                <div className={`text-lg font-bold ${cluster.total === 0 ? 'text-slate-500' : cluster.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${cluster.profit.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700/30">
                <div className="text-muted text-xs mb-1 flex items-center justify-center gap-1"><Activity size={12} /> {t('trades')}</div>
                <div className="text-lg font-bold text-white">
                  {cluster.total}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <GalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        imageUrls={galleryImages}
        title={galleryTitle}
      />
    </div>
  );
}
