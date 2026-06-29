import { useState, useEffect } from 'react';
import { fetchAllPaged } from '../lib/fetchAllPaged.js';

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
          // Duas buscas paginadas por BU, mescladas
          const [med, odo] = await Promise.all([
            fetchAllPaged('cvortex_pos_consulta', { dateField: 'data_referencia', startDate, endDate, orderField: 'data_referencia', filters: { bu: 'medicina' } }),
            fetchAllPaged('cvortex_pos_consulta', { dateField: 'data_referencia', startDate, endDate, orderField: 'data_referencia', filters: { bu: 'odontologia' } }),
          ]);
          result = [...med, ...odo];
        } else {
          result = await fetchAllPaged('cvortex_pos_consulta', {
            dateField: 'data_referencia', startDate, endDate, orderField: 'data_referencia', filters: { bu },
          });
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
