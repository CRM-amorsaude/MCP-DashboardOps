import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useEnrollments(startDate, endDate) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data: rows, error: err } = await supabase
          .from('hs_workflow_enrollments')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        if (err) throw err;
        if (cancelled) return;

        const byFlow = {};
        for (const r of rows) {
          if (!byFlow[r.flow_id]) {
            byFlow[r.flow_id] = { flow_id: r.flow_id, flow_name: r.flow_name, dailySeries: [] };
          }
          byFlow[r.flow_id].dailySeries.push({ date: r.date, enrollments: r.enrollments });
        }

        const result = Object.values(byFlow).map(f => {
          const series = f.dailySeries.sort((a, b) => a.date.localeCompare(b.date));
          const today  = series[series.length - 1]?.enrollments ?? 0;
          const prev   = series[series.length - 2]?.enrollments ?? 0;
          const prior  = series.slice(0, -1);
          const avg7d  = prior.length ? prior.reduce((s, d) => s + d.enrollments, 0) / prior.length : 0;
          const drop   = avg7d > 0 ? ((today - avg7d) / avg7d) * 100 : 0;
          return {
            ...f, today, prev,
            avg7d:   Math.round(avg7d),
            dropPct: Math.round(drop * 10) / 10,
            health:  drop <= -20 ? 'crit' : drop <= -10 ? 'warn' : 'ok',
          };
        });
        result.sort((a, b) => b.today - a.today);
        setData(result);
      } catch (e) { if (!cancelled) setError(e.message); }
      finally     { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  return { data, loading, error };
}
