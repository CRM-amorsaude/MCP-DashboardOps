import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { subDays, format } from 'date-fns';

export function useEmailMetrics(days = 7) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
        const { data: rows, error: err } = await supabase
          .from('hs_email_metrics')
          .select('*')
          .gte('date', since)
          .order('date', { ascending: false });
        if (err) throw err;

        const byEmail = {};
        for (const r of rows) {
          if (!byEmail[r.email_id]) {
            byEmail[r.email_id] = {
              email_id: r.email_id, hs_name: r.hs_name,
              sent: 0, delivered: 0, opened: 0, clicked: 0,
              bounced_hard: 0, bounced_soft: 0, unsubscribed: 0, spam_reports: 0,
              open_ratio_sum: 0, delivered_ratio_sum: 0, count: 0,
            };
          }
          const e = byEmail[r.email_id];
          e.sent         += r.sent         || 0;
          e.delivered    += r.delivered    || 0;
          e.opened       += r.opened       || 0;
          e.clicked      += r.clicked      || 0;
          e.bounced_hard += r.bounced_hard || 0;
          e.bounced_soft += r.bounced_soft || 0;
          e.unsubscribed += r.unsubscribed || 0;
          e.spam_reports += r.spam_reports || 0;
          if (r.open_ratio)      e.open_ratio_sum      += r.open_ratio;
          if (r.delivered_ratio) e.delivered_ratio_sum += r.delivered_ratio;
          e.count++;
        }

        const result = Object.values(byEmail)
          .filter(e => e.sent > 0)
          .map(e => ({
            ...e,
            delivery_rate:    e.sent > 0    ? Math.round(e.delivered / e.sent * 10000) / 100 : null,
            open_rate:        e.count > 0   ? Math.round(e.open_ratio_sum / e.count * 100) / 100 : null,
            hard_bounce_rate: e.sent > 0    ? Math.round(e.bounced_hard / e.sent * 10000) / 100 : null,
            spam_rate:        e.sent > 0    ? Math.round(e.spam_reports / e.sent * 10000) / 100 : null,
          }));
        result.sort((a, b) => b.sent - a.sent);
        setData(result);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
    load();
  }, [days]);

  return { data, loading, error };
}
