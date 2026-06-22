// Helpers de atribuição HubSpot
// Fonte: campaign_attribution_detail (Supabase) ← fl_cruzamento_campanhas_hubspot

export const MED_ERPS          = ['Amei', 'Amei!'];
export const ODO_ERPS          = ['Webdental', 'Webvidas'];
export const ODO_ORIGINS       = ['Odontologia', 'DentalVidas'];
export const POS_ORIGINS       = ['Pós Consulta', 'Proposta Manual', 'Proposta Automática'];
export const PAID_POS_STATUS   = ['Quitadas', 'Executada', 'Parcialmente quitada'];
export const PAID_ATEND_STATUS = ['Quitadas', 'Parcialmente quitada'];
export const PAID_STATUS       = ['Quitadas', 'Efetivado'];

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
  const n = v => Number(v) || 0;

  // Agendamentos: origem IN ('Agendamento', 'Atendimento') — todos os status
  const agendamentos = rows
    .filter(r => ['Agendamento', 'Atendimento'].includes((r.origem_descricao || '').trim()))
    .reduce((s, r) => s + n(r.conversoes), 0);

  // Atendimentos: origem = 'Atendimento' — todos os status
  const atendimentos = rows
    .filter(r => (r.origem_descricao || '').trim() === 'Atendimento')
    .reduce((s, r) => s + n(r.conversoes), 0);

  // Valor atendimento: origem = 'Atendimento' AND status pago (Quitadas, Parcialmente quitada)
  const valor_atend = rows
    .filter(r => (r.origem_descricao || '').trim() === 'Atendimento' && PAID_ATEND_STATUS.includes((r.nm_status || '').trim()))
    .reduce((s, r) => s + n(r.receita_atribuida), 0);

  const orig = r => (r.origem_descricao || '').trim();
  const stat = r => (r.nm_status || '').trim();

  // Qt Propostas: origem IN POS_ORIGINS AND medicina — todos os status
  const qt_propostas = rows
    .filter(r => POS_ORIGINS.includes(orig(r)) && isMed(r))
    .reduce((s, r) => s + n(r.conversoes), 0);

  // Qt Propostas Pagas: POS_ORIGINS + medicina + status pago
  const qt_propostas_pagas = rows
    .filter(r => POS_ORIGINS.includes(orig(r)) && isMed(r) && PAID_POS_STATUS.includes(stat(r)))
    .reduce((s, r) => s + n(r.conversoes), 0);

  // Fat. Pós: POS_ORIGINS + medicina + status pago → receita
  const fat_pos = rows
    .filter(r => POS_ORIGINS.includes(orig(r)) && isMed(r) && PAID_POS_STATUS.includes(stat(r)))
    .reduce((s, r) => s + n(r.receita_atribuida), 0);

  // Fat. Odonto: origem IN ('Odontologia', 'DentalVidas') AND status = 'Efetivado'
  const fat_odo = rows
    .filter(r => ODO_ORIGINS.includes(orig(r)) && stat(r) === 'Efetivado')
    .reduce((s, r) => s + n(r.receita_atribuida), 0);

  // Fat. Total: valor_atend + fat_pos + fat_odo
  const fat_total = valor_atend + fat_pos + fat_odo;

  const propostas_pagas = qt_propostas_pagas;
  const ticket_medio    = propostas_pagas > 0 ? fat_total / propostas_pagas : 0;

  return {
    agendamentos, atendimentos, valor_atend,
    qt_propostas, qt_propostas_pagas,
    fat_pos, fat_odo, fat_total,
    propostas_pagas, ticket_medio,
  };
}

export function calcCanais(rows) {
  // Considera apenas origem = Agendamento ou Atendimento
  const agRows = rows.filter(r => ['Agendamento', 'Atendimento'].includes((r.origem_descricao || '').trim()));
  const map = {};
  for (const r of agRows) {
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
    const m = calcMetrics([r]);
    map[r.nm_campanha].receita += m.fat_total;
  }
  return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, n);
}

export function calcPerEmail(rows, emailName) {
  const r = rows.filter(x => x.nm_campanha === emailName);
  return { nm_campanha: emailName, ...calcMetrics(r), canais: calcCanais(r) };
}

export function calcFatByMonth(rows) {
  const map = {};
  for (const r of rows) {
    const date  = r.data_referencia || '';
    const month = date.substring(0, 7);
    if (!month) continue;
    if (!map[month]) map[month] = { month, pos: 0, odo: 0, atend: 0 };
    const val = Number(r.receita_atribuida) || 0;
    if (POS_ORIGINS.includes(r.origem_descricao) && isMed(r) && PAID_POS_STATUS.includes(r.nm_status)) map[month].pos += val;
    if (ODO_ORIGINS.includes(r.origem_descricao) && r.nm_status === 'Efetivado') map[month].odo += val;
    if ((r.origem_descricao||'').trim() === 'Atendimento' && PAID_ATEND_STATUS.includes((r.nm_status||'').trim())) map[month].atend += val;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}
