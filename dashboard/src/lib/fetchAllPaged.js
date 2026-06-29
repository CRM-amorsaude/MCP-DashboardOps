import { supabase } from './supabase.js';

const PAGE_SIZE = 1000;
const MAX_PAGES = 500;
const PARALLEL  = 6; // requisições simultâneas por lote

function buildQuery(table, { dateField, startDate, endDate, filters, orderField, columns }) {
  let q = supabase.from(table).select(columns || '*', { count: 'exact' });
  if (dateField && startDate) q = q.gte(dateField, startDate);
  if (dateField && endDate)   q = q.lte(dateField, endDate);
  for (const [col, val] of Object.entries(filters || {})) q = q.eq(col, val);
  return q.order(orderField, { ascending: true });
}

/**
 * Busca paginada com paralelismo.
 * 1ª requisição traz a contagem exata (count) + primeira página.
 * As páginas restantes são buscadas em lotes paralelos.
 */
export async function fetchAllPaged(table, opts = {}) {
  const { orderField = 'id' } = opts;

  // Página 0: pega count exato + primeiras 1000 linhas
  const first = await buildQuery(table, { ...opts, orderField })
    .range(0, PAGE_SIZE - 1);

  if (first.error) {
    console.error(`fetchAllPaged(${table}) erro:`, first.error.message);
    return [];
  }

  const rows  = first.data || [];
  const total = first.count ?? rows.length;

  if (total <= PAGE_SIZE) return rows;

  const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
  let all = [...rows];

  // Páginas 1..N em lotes paralelos
  for (let batchStart = 1; batchStart < totalPages; batchStart += PARALLEL) {
    const batch = [];
    for (let p = batchStart; p < batchStart + PARALLEL && p < totalPages; p++) {
      const from = p * PAGE_SIZE;
      batch.push(
        buildQuery(table, { ...opts, orderField }).range(from, from + PAGE_SIZE - 1)
      );
    }
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r.error) {
        console.error(`fetchAllPaged(${table}) erro em lote:`, r.error.message);
        continue;
      }
      if (r.data) all = all.concat(r.data);
    }
  }

  return all;
}
