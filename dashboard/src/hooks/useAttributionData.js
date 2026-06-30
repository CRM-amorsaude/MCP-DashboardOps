import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

// Consome as RPCs de atribuição (cálculo feito no Postgres).
// Retorna dados já agregados, sem trafegar linhas cruas.
// kpis: KPIs consolidados da Visão Geral (e-mail + cVortex) via rpc_estrategico_kpis
export function useAttributionData(startDate, endDate, bu = 'todos') {
  const [data, setData] = useState({
    porCampanha:   [],
    canais:        [],
    especialidades: [],
    convenios:     [],
    fatMes:        [],
    kpis:          null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const args = { p_start: startDate, p_end: endDate, p_bu: bu };
      try {
        const [camp, can, esp, conv, fat, kpi] = await Promise.all([
          supabase.rpc('rpc_attribution_por_campanha', args),
          supabase.rpc('rpc_attribution_canais', args),
          supabase.rpc('rpc_attribution_especialidades', args),
          supabase.rpc('rpc_attribution_convenios', args),
          supabase.rpc('rpc_attribution_fat_mes', args),
          supabase.rpc('rpc_estrategico_kpis', args),
        ]);

        const firstErr = [camp, can, esp, conv, fat, kpi].find(r => r.error);
        if (firstErr?.error) throw firstErr.error;

        if (!cancelled) {
          setData({
            porCampanha:    camp.data || [],
            canais:         can.data  || [],
            especialidades: esp.data  || [],
            convenios:      conv.data || [],
            fatMes:         fat.data  || [],
            kpis:           (kpi.data && kpi.data[0]) || null,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate, bu]);

  return { data, loading, error };
}
