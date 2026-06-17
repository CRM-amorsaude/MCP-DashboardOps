import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { subDays, format } from 'date-fns';

export function useEnrollments(days = 7) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
        const { data: rows, error: err } = await supabase
          .from('hs_workflow_enrollments')
          .select('*')
          .gte('date', since)
          .order('date', { ascending: false });
        if (err) throw err;

        const byFlow = {};
        for (const r of rows) {
          if (!byFlow[r.flow_id]) {
            byFlow[r.flow_id] = { flow_id: r.flow_id, flow_name: r.flow_name, days: [] };
          }
          byFlow[r.flow_id].days.push({ date: r.date, enrollments: r.enrollments });
        }

        const result = Object.values(byFlow).map(f => {
          const sorted = f.days.sort((a, b) => b.date.localeCompare(a.date));
          const today  = sorted[0]?.enrollments ?? 0;
          const prev   = sorted[1]?.enrollments ?? 0;
          const prior  = sorted.slice(1);
          const avg7d  = prior.length ? prior.reduce((s, d) => s + d.enrollments, 0) / prior.length : 0;
          const drop   = avg7d > 0 ? ((today - avg7d) / avg7d) * 100 : 0;
          return {
            ...f,
            today, prev,
            avg7d: Math.round(avg7d),
            dropPct: Math.round(drop * 10) / 10,
            health: drop <= -20 ? 'crit' : drop <= -10 ? 'warn' : 'ok',
            series: sorted.slice(0, 7).reverse().map(d => d.enrollments),
          };
        });
        result.sort((a, b) => b.today - a.today);
        setData(result);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, [days]);

  return { data, loading, error };
}
