import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

// Consome rpc_cvortex_resumo (agregação no Postgres).
// Mantém o formato de linhas que o WhatsAppTab espera:
// { bu, situacao_pagamento, tipo_tratamento, conversoes, receita }
export function useCvortex(startDate, endDate /*, bu ignorado: RPC traz ambos */) {
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
        const { data, error: err } = await supabase.rpc('rpc_cvortex_resumo', {
          p_start: startDate, p_end: endDate,
        });
        if (err) throw err;
        if (!cancelled) setRows(data || []);
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
