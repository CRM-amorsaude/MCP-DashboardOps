import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useAttributionData(startDate, endDate) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('campaign_attribution_detail')
          .select('*')
          .gte('data_referencia', startDate)
          .lte('data_referencia', endDate);
        if (err) throw err;
        if (!cancelled) setRows(data || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  return { rows, loading, error };
}
