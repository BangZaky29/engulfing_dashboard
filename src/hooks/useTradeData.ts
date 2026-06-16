import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TradeAnalytics, TradeActiveLog } from '../types';

export function useTradeData() {
  const [trades, setTrades] = useState<TradeAnalytics[]>([]);
  const [activeLogs, setActiveLogs] = useState<TradeActiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const { data: tradesData, error: tradesErr } = await supabase
        .from('trade_deep_analytics_view')
        .select('*')
        .order('trade_created_at', { ascending: false });

      if (tradesErr) {
        throw tradesErr;
      }

      const { data: logsData, error: logsErr } = await supabase
        .from('trade_active_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsErr) {
        throw logsErr;
      }

      setTrades((tradesData as TradeAnalytics[]) || []);
      setActiveLogs((logsData as TradeActiveLog[]) || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
      console.error('Error fetching trades and logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Pass false to avoid synchronous setState inside useEffect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTrades(false);

    // Subscribe to realtime changes on trade_analytics
    const channelTrades = supabase
      .channel('trade_analytics_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'trade_analytics',
        },
        () => {
          void fetchTrades(false);
        }
      )
      .subscribe();

    // Subscribe to realtime changes on trade_active_logs
    const channelLogs = supabase
      .channel('trade_active_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'trade_active_logs',
        },
        () => {
          void fetchTrades(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelTrades);
      supabase.removeChannel(channelLogs);
    };
  }, []);

  return { trades, activeLogs, loading, error, refetch: fetchTrades };
}
