import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';

const STATUS_ATENDIDO = 'Atendido';

// ─── Hook principal ──────────────────────────────────────────
export function useConfirmacoes({ startDate, endDate }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);

    try {
      const { data: rows, error: err } = await supabase
        .from('confirmacoes')
        .select('*')
        .gte('data_referencia', format(startDate, 'yyyy-MM-dd'))
        .lte('data_referencia', format(endDate, 'yyyy-MM-dd'));

      if (err) throw err;
      setData(rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Helpers de cálculo ──────────────────────────────────────

/** KPIs gerais por BU */
export function calcKpisByBu(rows) {
  const result = {
    Medicina: { confirmacoes: 0, atendidos: 0 },
    Odonto:   { confirmacoes: 0, atendidos: 0 },
  };

  for (const row of rows) {
    const bu = row.bu;
    if (!result[bu]) continue;
    result[bu].confirmacoes += row.confirmacoes || 0;
    if (row.status_agendamento === STATUS_ATENDIDO) {
      result[bu].atendidos += row.confirmacoes || 0;
    }
  }

  for (const bu of Object.keys(result)) {
    const { confirmacoes, atendidos } = result[bu];
    result[bu].taxa = confirmacoes > 0 ? (atendidos / confirmacoes) * 100 : 0;
  }

  return result;
}

/** Breakdown por canal × BU */
export function calcByCanal(rows) {
  const canais = ['WhatsApp', 'Email', 'Push'];
  const result = {};

  for (const canal of canais) {
    result[canal] = {
      Medicina: { confirmacoes: 0, atendidos: 0 },
      Odonto:   { confirmacoes: 0, atendidos: 0 },
    };
  }

  for (const row of rows) {
    const { canal, bu } = row;
    if (!result[canal] || !result[canal][bu]) continue;
    result[canal][bu].confirmacoes += row.confirmacoes || 0;
    if (row.status_agendamento === STATUS_ATENDIDO) {
      result[canal][bu].atendidos += row.confirmacoes || 0;
    }
  }

  for (const canal of canais) {
    for (const bu of ['Medicina', 'Odonto']) {
      const { confirmacoes, atendidos } = result[canal][bu];
      result[canal][bu].taxa = confirmacoes > 0 ? (atendidos / confirmacoes) * 100 : 0;
    }
  }

  return result;
}

/** Série diária para o gráfico de linha */
export function calcDailySeries(rows) {
  const byDate = {};

  for (const row of rows) {
    const d = row.data_referencia;
    if (!byDate[d]) byDate[d] = { date: d, Medicina: 0, Odonto: 0 };
    byDate[d][row.bu] = (byDate[d][row.bu] || 0) + (row.confirmacoes || 0);
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/** Variação percentual: (atual - anterior) / anterior × 100 */
export function calcVariacao(atual, anterior) {
  if (!anterior || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/**
 * Busca o período anterior (mesmo número de dias) para calcular variação.
 * Retorna os mesmos helpers calculados com os dados do período ant.
 */
export async function fetchPeriodoAnterior(startDate, endDate) {
  const dias = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd   = subDays(startDate, 1);
  const prevStart = subDays(prevEnd, dias - 1);

  const { data: rows, error } = await supabase
    .from('confirmacoes')
    .select('*')
    .gte('data_referencia', format(prevStart, 'yyyy-MM-dd'))
    .lte('data_referencia', format(prevEnd,   'yyyy-MM-dd'));

  if (error) throw error;
  return rows || [];
}
