import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

const PAGE_SIZE = 1000;

// Busca paginada: o Supabase tem um cap de rows por request (tipicamente 1000).
// Sem paginar, registros são truncados silenciosamente e campanhas inteiras
// somem da agregação. Paginamos via range() até esgotar os dados.
async function fetchAllPaged(startDate, endDate) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('campaign_attribution_detail')
      .select('*')
      .gte('data_referencia', startDate)
      .lte('data_referencia', endDate)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

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
        const data = await fetchAllPaged(startDate, endDate);
        if (!cancelled) setRows(data);
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
