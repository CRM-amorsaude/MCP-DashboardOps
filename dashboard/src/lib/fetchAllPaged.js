import { supabase } from './supabase.js';

const PAGE_SIZE = 1000;

/**
 * Busca paginada genérica para contornar o cap de rows do Supabase
 * (tipicamente 1000 por request). Sem isso, registros são truncados
 * silenciosamente e dados somem das agregações.
 *
 * @param {string} table       Nome da tabela
 * @param {object} opts
 * @param {string} opts.dateField   Campo de data para filtro (gte/lte)
 * @param {string} opts.startDate   Data início (yyyy-MM-dd)
 * @param {string} opts.endDate     Data fim (yyyy-MM-dd)
 * @param {string} opts.orderField  Campo de ordenação estável (default 'id')
 * @param {object} opts.filters     Filtros eq adicionais { coluna: valor }
 * @returns {Promise<Array>}
 */
export async function fetchAllPaged(table, {
  dateField,
  startDate,
  endDate,
  orderField = 'id',
  filters = {},
} = {}) {
  let all  = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select('*');

    if (dateField && startDate) query = query.gte(dateField, startDate);
    if (dateField && endDate)   query = query.lte(dateField, endDate);

    for (const [col, val] of Object.entries(filters)) {
      query = query.eq(col, val);
    }

    query = query.order(orderField, { ascending: true }).range(from, from + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
