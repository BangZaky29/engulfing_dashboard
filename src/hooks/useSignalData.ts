import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EngulfingSignal } from '../types';

export function useSignalData() {
  const [signals, setSignals] = useState<EngulfingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('engulfing_signals')
        .select('*')
        .order('signal_time', { ascending: false });

      if (error) {
        throw error;
      }

      setSignals((data as EngulfingSignal[]) || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
      console.error('Error fetching signals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSignals();

    const channel = supabase
      .channel('engulfing_signals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engulfing_signals',
        },
        () => {
          fetchSignals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { signals, loading, error, refetch: fetchSignals };
}
