import { useState, useEffect, useCallback } from 'react';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { fetchAllPaged } from '../lib/fetchAllPaged.js';

const STATUS_ATENDIDO = 'Atendido';

// ─── Hook principal — recebe strings 'yyyy-MM-dd' ─────────────
export function useConfirmacoes(startDate, endDate) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllPaged('confirmacoes', {
        dateField: 'data_referencia', startDate, endDate, orderField: 'data_referencia',
      });
      setData(rows);
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

export function calcKpisByBu(rows) {
  const result = {
    Medicina: { confirmacoes: 0, atendidos: 0, taxa: 0 },
    Odonto:   { confirmacoes: 0, atendidos: 0, taxa: 0 },
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

export function calcByCanal(rows) {
  const canais = ['WhatsApp', 'Email', 'Push'];
  const result = {};
  for (const canal of canais) {
    result[canal] = {
      Medicina: { confirmacoes: 0, atendidos: 0, taxa: 0 },
      Odonto:   { confirmacoes: 0, atendidos: 0, taxa: 0 },
    };
  }
  for (const row of rows) {
    const { canal, bu } = row;
    if (!result[canal]?.[bu]) continue;
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

export function calcDailySeries(rows) {
  const byDate = {};
  for (const row of rows) {
    const d = row.data_referencia;
    if (!byDate[d]) byDate[d] = { date: d, Medicina: 0, Odonto: 0 };
    byDate[d][row.bu] = (byDate[d][row.bu] || 0) + (row.confirmacoes || 0);
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

export function calcVariacao(atual, anterior) {
  if (!anterior || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

export async function fetchPeriodoAnterior(startDate, endDate) {
  const start = parseISO(startDate);
  const end   = parseISO(endDate);
  const dias  = differenceInDays(end, start) + 1;
  const prevEnd   = subDays(start, 1);
  const prevStart = subDays(prevEnd, dias - 1);

  return fetchAllPaged('confirmacoes', {
    dateField:  'data_referencia',
    startDate:  format(prevStart, 'yyyy-MM-dd'),
    endDate:    format(prevEnd,   'yyyy-MM-dd'),
    orderField: 'data_referencia',
  });
}
