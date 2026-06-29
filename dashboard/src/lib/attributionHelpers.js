// Helpers de atribuição — adaptados para consumir dados das RPCs.
// As RPCs já entregam UMA linha por nm_campanha com os números calculados:
//   { nm_campanha, agendamentos, atendimentos, valor_atend,
//     qt_propostas, qt_propostas_pagas, fat_pos, fat_odo, fat_total }
// Aqui só somamos campos prontos — sem reprocessar linhas cruas.

const n = v => Number(v) || 0;

// Soma um conjunto de linhas-por-campanha (vindas da RPC) num único objeto de métricas.
export function sumCampanhas(rows) {
  const acc = {
    agendamentos: 0, atendimentos: 0, valor_atend: 0,
    qt_propostas: 0, qt_propostas_pagas: 0,
    fat_pos: 0, fat_odo: 0, fat_total: 0,
  };
  for (const r of rows) {
    acc.agendamentos       += n(r.agendamentos);
    acc.atendimentos       += n(r.atendimentos);
    acc.valor_atend        += n(r.valor_atend);
    acc.qt_propostas       += n(r.qt_propostas);
    acc.qt_propostas_pagas += n(r.qt_propostas_pagas);
    acc.fat_pos            += n(r.fat_pos);
    acc.fat_odo            += n(r.fat_odo);
    acc.fat_total          += n(r.fat_total);
  }
  acc.propostas_pagas = acc.qt_propostas_pagas;
  acc.ticket_medio    = acc.propostas_pagas > 0 ? acc.fat_total / acc.propostas_pagas : 0;
  return acc;
}

// Métrica de uma única campanha (linha da RPC). Retorna zeros se não achar.
export function metricsForCampanha(porCampanha, nm) {
  const clean = s => (s || '').trim();
  const row = porCampanha.find(r => clean(r.nm_campanha) === clean(nm));
  if (!row) {
    return {
      agendamentos: 0, atendimentos: 0, valor_atend: 0,
      qt_propostas: 0, qt_propostas_pagas: 0,
      fat_pos: 0, fat_odo: 0, fat_total: 0,
      propostas_pagas: 0, ticket_medio: 0,
    };
  }
  return sumCampanhas([row]);
}

// Top N campanhas por faturamento total (linhas já prontas da RPC).
export function topCampanhas(porCampanha, count = 10) {
  return [...porCampanha]
    .map(r => ({ nm_campanha: r.nm_campanha, conversoes: n(r.agendamentos), receita: n(r.fat_total) }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, count);
}

// Converte saída de rpc_attribution_canais em {label,count,pct}
export function canaisToBars(canais) {
  const total = canais.reduce((s, c) => s + n(c.conversoes), 0);
  return canais.map(c => ({
    label: c.nm_canal,
    count: n(c.conversoes),
    pct:   total > 0 ? Math.round(n(c.conversoes) / total * 100) : 0,
  }));
}

// Converte rpc_attribution_especialidades em {label,count}
export function especialidadesToList(esps) {
  return esps.map(e => ({ label: e.nm_especialidade, count: n(e.conversoes) }));
}

// Converte rpc_attribution_convenios em {label,count,pct}
export function conveniosToBars(convs, topN = 4) {
  const total = convs.reduce((s, c) => s + n(c.conversoes), 0);
  return convs.slice(0, topN).map(c => ({
    label: c.nm_convenio,
    count: n(c.conversoes),
    pct:   total > 0 ? Math.round(n(c.conversoes) / total * 100) : 0,
  }));
}

// Converte rpc_attribution_fat_mes em [{month,pos,odo,atend}]
export function fatMesToSeries(fatMes) {
  return fatMes.map(r => ({
    month: r.mes, pos: n(r.pos), odo: n(r.odo), atend: n(r.atend),
  }));
}
