import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useCvortex(startDate, endDate, bu = 'todos') {
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
        let query = supabase
          .from('cvortex_pos_consulta')
          .select('*')
          .gte('data_referencia', startDate)
          .lte('data_referencia', endDate);
        if (bu !== 'todos') query = query.eq('bu', bu);
        query = query.limit(50000);
        const { data, error: err } = await query;
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
  }, [startDate, endDate, bu]);

  return { rows, loading, error };
}
