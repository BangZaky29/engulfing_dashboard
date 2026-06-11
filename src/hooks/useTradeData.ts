import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TradeAnalytics } from '../types';

export function useTradeData() {
  const [trades, setTrades] = useState<TradeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const { data, error } = await supabase
        .from('trade_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTrades((data as TradeAnalytics[]) || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
      console.error('Error fetching trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pass false to avoid synchronous setState inside useEffect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTrades(false);

    // Subscribe to realtime changes
    const channel = supabase
      .channel('trade_analytics_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'trade_analytics',
        },
        (payload) => {
          console.log('Realtime payload:', payload);
          // Refresh data to keep it simple and ensure ordering
          // Alternatively, we could update the state directly
          fetchTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { trades, loading, error, refetch: fetchTrades };
}
