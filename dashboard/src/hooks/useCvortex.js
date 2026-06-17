import { useState, useEffect } from 'react';

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
        const res = await fetch('/api/cvortex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, bu }),
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
  }, [startDate, endDate, bu]);

  return { rows, loading, error };
}
