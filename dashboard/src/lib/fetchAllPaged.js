import { supabase } from './supabase.js';

const PAGE_SIZE = 1000;
const MAX_PAGES = 500; // trava de segurança: 500k linhas máx

/**
 * Busca paginada genérica para contornar o cap de rows do Supabase.
 * Pagina via .range() em blocos até esgotar os dados, com trava de
 * segurança contra loop infinito.
 */
export async function fetchAllPaged(table, {
  dateField,
  startDate,
  endDate,
  orderField = 'id',
  filters = {},
} = {}) {
  let all  = [];
  let page = 0;

  while (page < MAX_PAGES) {
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let query = supabase.from(table).select('*');

    if (dateField && startDate) query = query.gte(dateField, startDate);
    if (dateField && endDate)   query = query.lte(dateField, endDate);

    for (const [col, val] of Object.entries(filters)) {
      query = query.eq(col, val);
    }

    query = query.order(orderField, { ascending: true }).range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error(`fetchAllPaged(${table}) erro na página ${page}:`, error.message);
      // Retorna o que já tem em vez de travar a UI
      break;
    }

    if (!data || data.length === 0) break;

    all = all.concat(data);

    // Última página: veio menos que o tamanho cheio
    if (data.length < PAGE_SIZE) break;

    page += 1;
  }

  return all;
}
