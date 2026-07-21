import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type TriggerAnalyticsMode = 'BUY' | 'SELL';

export interface TradeTriggerAnalyticsRow {
  trade_date: string;
  symbol: string;
  trigger_type: string;
  mode: TriggerAnalyticsMode;
  tf_execute: string;
  tf_monitor: string;

  total_trades: number | null;
  total_profit_count: number | null;
  total_loss_count: number | null;
  total_profit_usd: number | null;
  total_loss_usd: number | null;

  probability_profit: number | null;

  max_negative_floating_before_profit_usd: number | null;
  max_negative_floating_before_profit_pct: number | null;
  sum_negative_floating_before_profit_usd: number | null;

  // Distance points fields (dari trade_floating_snapshots agregat)
  max_negative_distance_points: number | null;         // ← TAMBAH INI
  max_negative_distance_price_points: number | null;   // ← TAMBAH INI
  sum_negative_distance_points: number | null;         // ← TAMBAH INI

  // Deep improv metrics (from trade_trigger_floating_analytics view)
  avg_max_before_profit_usd?: number | null;
  max_max_before_profit_usd?: number | null;
  avg_max_before_profit_pct_usd_based?: number | null;
  avg_total_distance_price_usd_based?: number | null;
  sum_total_distance_price_usd_based?: number | null;

  avg_max_before_profit_pct?: number | null;
  max_max_before_profit_pct?: number | null;
  avg_max_before_profit_usd_pct_based?: number | null;
  avg_total_distance_price_pct_based?: number | null;
  sum_total_distance_price_pct_based?: number | null;

  // Opsi C (MFE positif — mirror dari Opsi A/B negatif)
  max_positive_floating_before_loss_usd: number | null;
  max_positive_floating_before_loss_pct: number | null;
  sum_positive_floating_before_loss_usd: number | null;
  max_positive_distance_points: number | null;
  max_positive_distance_price_points: number | null;
  sum_positive_distance_points: number | null;
}


export function useTriggerAnalyticsData() {
  const [rows, setRows] = useState<TradeTriggerAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      // Primary source: existing probability metrics
      // Extra floating metrics: join-like approach is not available at client,
      // so we fetch from the view that contains BOTH sets we need.
      const { data, error: err } = await supabase
        .from('trade_trigger_floating_analytics')
        .select('*')
        .order('trade_date', { ascending: false })
        .limit(250);


      if (err) throw err;
      setRows((data as TradeTriggerAnalyticsRow[]) || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      console.error('Error fetching trade_trigger_floating_analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(false);

    const channel = supabase
      .channel('trade_trigger_floating_analytics_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_floating_snapshots' },
        () => {
          void fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = useMemo(() => {
    if (!rows.length) return null;
    return rows[0];
  }, [rows]);

  return { rows, latest, loading, error, refetch: fetchData };
}
