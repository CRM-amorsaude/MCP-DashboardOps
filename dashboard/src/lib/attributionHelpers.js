// Helpers para agregação de dados de atribuição HubSpot
// Fonte: fl_cruzamento_campanhas_hubspot via Metabase /api/attribution

export const MED_ERPS     = ['Amei', 'Amei!'];
export const ODO_ERPS     = ['Webdental', 'Webvidas'];
export const ODO_ORIGINS  = ['Odontologia', 'DentalVidas'];
export const POS_ORIGINS  = ['Pós Consulta', 'Proposta Manual', 'Proposta Automática'];
export const PAID_STATUS  = ['Quitadas', 'Efetivado'];

export const isMed  = r => MED_ERPS.includes(r.erp);
export const isOdo  = r => ODO_ERPS.includes(r.erp) || ODO_ORIGINS.includes(r.origem_descricao);
export const isPaid = r => PAID_STATUS.includes(r.nm_status);

export function filterBU(rows, bu) {
  if (!bu || bu === 'todos') return rows;
  if (bu === 'medicina')    return rows.filter(isMed);
  if (bu === 'odontologia') return rows.filter(isOdo);
  return rows;
}

export function calcMetrics(rows) {
  const n = (v) => Number(v) || 0;
  const agendamentos    = rows.filter(r => r.origem_descricao === 'Agendamento')
    .reduce((s, r) => s + n(r.conversoes), 0);
  const atendimentos    = rows.filter(r => POS_ORIGINS.includes(r.origem_descricao) && isMed(r))
    .reduce((s, r) => s + n(r.conversoes), 0);
  const valor_atend     = rows.filter(r => r.origem_descricao === 'Agendamento' && r.nm_status === 'Quitadas')
    .reduce((s, r) => s + n(r.receita_atribuida), 0);
  const qt_exames       = rows.filter(r => r.nm_status === 'Quitadas')
    .reduce((s, r) => s + n(r.conversoes), 0);
  const fat_pos         = rows.filter(r => POS_ORIGINS.includes(r.origem_descricao) && isMed(r) && isPaid(r))
    .reduce((s, r) => s + n(r.receita_atribuida), 0);
  const fat_odo         = rows.filter(r => isOdo(r) && isPaid(r))
    .reduce((s, r) => s + n(r.receita_atribuida), 0);
  const fat_total       = rows.filter(r => isPaid(r))
    .reduce((s, r) => s + n(r.receita_atribuida), 0);
  const propostas_pagas = rows.filter(r => isPaid(r))
    .reduce((s, r) => s + n(r.conversoes), 0);
  const ticket_medio    = propostas_pagas > 0 ? fat_total / propostas_pagas : 0;
  return { agendamentos, atendimentos, valor_atend, qt_exames, fat_pos, fat_odo, fat_total, propostas_pagas, ticket_medio };
}

export function calcCanais(rows) {
  const map = {};
  for (const r of rows) {
    const canal = r.nm_canal || 'Desconhecido';
    map[canal] = (map[canal] || 0) + (Number(r.conversoes) || 0);
  }
  const total = Object.values(map).reduce((s, v) => s + v, 0);
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round(count / total * 100) : 0 }));
}

export function calcEspecialidades(rows) {
  const map = {};
  for (const r of rows) {
    const esp = r.nm_especialidade || 'Desconhecido';
    map[esp] = (map[esp] || 0) + (Number(r.conversoes) || 0);
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

export function calcTopCampanhas(rows, n = 10) {
  const map = {};
  for (const r of rows) {
    if (!map[r.nm_campanha]) map[r.nm_campanha] = { nm_campanha: r.nm_campanha, conversoes: 0, receita: 0 };
    map[r.nm_campanha].conversoes += Number(r.conversoes) || 0;
    if (isPaid(r)) map[r.nm_campanha].receita += Number(r.receita_atribuida) || 0;
  }
  return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, n);
}

// Agrega métricas por email individual a partir dos rows brutos
export function calcPerEmail(rows, emailName) {
  const r = rows.filter(x => x.nm_campanha === emailName);
  return { nm_campanha: emailName, ...calcMetrics(r), canais: calcCanais(r) };
}

// Agrega faturamento por origem e mês para o gráfico de linha
export function calcFatByMonth(rows) {
  const map = {};
  for (const r of rows) {
    if (!isPaid(r)) continue;
    const date = r.data_referencia || '';
    const month = date.substring(0, 7); // YYYY-MM
    if (!month) continue;
    if (!map[month]) map[month] = { month, pos: 0, odo: 0, atend: 0 };
    const val = Number(r.receita_atribuida) || 0;
    if (POS_ORIGINS.includes(r.origem_descricao) && isMed(r)) map[month].pos += val;
    if (isOdo(r)) map[month].odo += val;
    if (r.origem_descricao === 'Agendamento') map[month].atend += val;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}
