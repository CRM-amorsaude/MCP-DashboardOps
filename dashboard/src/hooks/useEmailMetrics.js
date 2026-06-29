import { useState, useEffect } from 'react';
import { fetchAllPaged } from '../lib/fetchAllPaged.js';

export function useEmailMetrics(startDate, endDate) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const rows = await fetchAllPaged('hs_email_metrics', {
          dateField: 'date', startDate, endDate, orderField: 'date',
        });
        if (cancelled) return;

        const byEmail = {};
        for (const r of rows) {
          if (!byEmail[r.email_id]) {
            byEmail[r.email_id] = {
              email_id: r.email_id, hs_name: r.hs_name,
              sent: 0, delivered: 0, opened: 0, clicked: 0,
              bounced_hard: 0, spam_reports: 0,
              open_ratio_sum: 0, delivered_ratio_sum: 0, count: 0,
              dailySeries: [],
            };
          }
          const e = byEmail[r.email_id];
          e.sent         += r.sent         || 0;
          e.delivered    += r.delivered    || 0;
          e.opened       += r.opened       || 0;
          e.clicked      += r.clicked      || 0;
          e.bounced_hard += r.bounced_hard || 0;
          e.spam_reports += r.spam_reports || 0;
          if (r.open_ratio)      e.open_ratio_sum      += r.open_ratio;
          if (r.delivered_ratio) e.delivered_ratio_sum += r.delivered_ratio;
          e.count++;
          e.dailySeries.push({
            date:      r.date,
            sent:      r.sent      || 0,
            delivered: r.delivered || 0,
            opened:    r.opened    || 0,
            clicked:   r.clicked   || 0,
          });
        }

        const result = Object.values(byEmail)
          .filter(e => e.sent > 0)
          .map(e => ({
            ...e,
            delivery_rate:    e.sent > 0  ? Math.round(e.delivered / e.sent * 10000) / 100 : null,
            open_rate:        e.count > 0 ? Math.round(e.open_ratio_sum / e.count * 100) / 100 : null,
            hard_bounce_rate: e.sent > 0  ? Math.round(e.bounced_hard / e.sent * 10000) / 100 : null,
            spam_rate:        e.sent > 0  ? Math.round(e.spam_reports / e.sent * 10000) / 100 : null,
          }));
        result.sort((a, b) => b.sent - a.sent);
        setData(result);
      } catch (e) { if (!cancelled) setError(e.message); }
      finally     { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  return { data, loading, error };
}
