import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useAttribution(erp = 'todos') {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let q = supabase
          .from('campaign_attribution_summary')
          .select('*')
          .order('receita_atribuida', { ascending: false });
        if (erp !== 'todos') q = q.eq('erp', erp);
        const { data: rows, error: err } = await q;
        if (err) throw err;
        setData(rows || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, [erp]);

  return { data, loading, error };
}

export function aggregateCampaigns(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.nm_campanha]) {
      map[r.nm_campanha] = {
        nm_campanha: r.nm_campanha, erp: r.erp,
        conversoes: 0, receita_atribuida: 0,
        ultima_abertura: r.ultima_abertura,
        tipos: [],
      };
    }
    const c = map[r.nm_campanha];
    c.conversoes        += r.conversoes || 0;
    c.receita_atribuida += Number(r.receita_atribuida) || 0;
    if (r.ultima_abertura > c.ultima_abertura) c.ultima_abertura = r.ultima_abertura;
    c.tipos.push({
      origem: r.origem_descricao || 'Outros',
      status: r.nm_status || '',
      conversoes: r.conversoes || 0,
      receita: Number(r.receita_atribuida) || 0,
    });
  }
  return Object.values(map)
    .map(c => ({
      ...c,
      ticket_medio: c.conversoes > 0 ? c.receita_atribuida / c.conversoes : 0,
    }))
    .sort((a, b) => b.receita_atribuida - a.receita_atribuida);
}
