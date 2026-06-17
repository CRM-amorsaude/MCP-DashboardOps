import { useState, useEffect } from 'react';
import { FLOW_MAP } from '../lib/flowMap.js';

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
        const allEmails = [...new Set(FLOW_MAP.flatMap(f => f.emails))];
        const res = await fetch('/api/attribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, emails: allEmails }),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        if (!cancelled) setRows(json.rows || []);
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
