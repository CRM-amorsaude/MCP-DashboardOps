import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

async function fetchBU(startDate, endDate, bu) {
  const { data, error } = await supabase
    .from('cvortex_pos_consulta')
    .select('*')
    .gte('data_referencia', startDate)
    .lte('data_referencia', endDate)
    .eq('bu', bu)
    .limit(100000);
  if (error) throw error;
  return data || [];
}

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
        let result;
        if (bu === 'todos') {
          // Duas queries separadas para evitar corte por limite de rows
          const [med, odo] = await Promise.all([
            fetchBU(startDate, endDate, 'medicina'),
            fetchBU(startDate, endDate, 'odontologia'),
          ]);
          result = [...med, ...odo];
        } else {
          result = await fetchBU(startDate, endDate, bu);
        }
        if (!cancelled) setRows(result);
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
