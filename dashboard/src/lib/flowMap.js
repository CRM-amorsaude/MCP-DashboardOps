// Mapeamento fluxo HubSpot → e-mails → nm_campanha (Athena)
// Chave de junção para o funil estratégico
//
// emails[]        → nomes no HubSpot (hs_email_metrics.hs_name)
// athenaCampaigns → nomes no Athena (campaign_attribution_detail.nm_campanha)
//                   Se ausente, usa emails[] como fallback

export const FLOW_MAP = [
  {
    flowId:   '1821983290',
    flowName: 'PILOTO AS | Trabalhe Conosco',
    bu:       'Medicina',
    emails: [
      'AS | Trabalhe Conosco - Telemedicina',
      'AS | 2025 - RPS - Trabalhe Conosco',
    ],
  },
  {
    flowId:   '1820984087',
    flowName: 'Med Reativação de Pacientes - 3 segmentações',
    bu:       'Medicina',
    emails: [
      'AS | 2026 - Reativação de Pacientes - Jornada 01 - Dia 01',
      'AS | 2026 - Reativação de Pacientes - Jornada 01 - Dia 15',
      'AS | 2026 - Reativação de Pacientes - Jornada 02 - Dia 01',
      'AS | 2026 - Reativação de Pacientes - Jornada 03 - Dia 05',
    ],
  },
  {
    flowId:   '1828313490',
    flowName: 'Odonto - Pesquisa de No Show',
    bu:       'Odonto',
    emails: [
      'AS | Odonto - Pesquisa NoShow',
    ],
  },
  {
    flowId:   '1618107519',
    flowName: 'Med - Confirmação Consultas D-3, D-2 e Lembrete',
    bu:       'Medicina',
    emails: [
      'AS | AMEI - Consulta Agendada - Confirmação - Nova - Versão B (Sem horário)',
      'AS | AMEI - Consulta Agendada - Confirmação - Nova - Versão B (Sem horário) CTA APP',
      'AS | AMEI - Consulta Agendada - Confirmação - Nova Versão B - Com Data - CTA APP',
      'AS | AMEI - Confirmação de Consulta - Nova D3 - A - Versão B - Versão B (Sem horário)',
      'AS | AMEI - Confirmação de Consulta - Nova D3 - A - Versão B',
      'AS | AMEI - Confirmação de Consulta - Nova D3 - A - Versão B (Sem horário) CTA APP',
      'AS | AMEI - Confirmação de Consulta - Nova D3 - A - Com Data - CTA APP',
      'AS | AMEI - Confirmação de Consulta - Nova D2 - A - Versão B',
      'AS | AMEI - Confirmação de Consulta - Nova D2 - A - Versão B (Sem horário)',
      'AS | AMEI - Confirmação de Consulta - Nova D2 - A - Versão B (Sem horário) CTA APP',
      'AS | AMEI - Confirmação de Consulta - Nova D2 - A - Com Data - CTA APP',
      'AS | AMEI - Lembrete da Consulta - Nova Versão B (Sem horário)',
      'AS | AMEI - Lembrete da Consulta - Nova Versão B (Sem horário) CTA APP',
      'AS | AMEI - Lembrete da Consulta - Nova Versão B - Com Data - CTA APP',
      'AS | AMEI - Lembrete da Consulta - Nova Versão B',
      'AS | AMEI - Consulta Agendada - Confirmação - Nova - Versão B',
    ],
  },
  {
    flowId:   '607507381',
    flowName: 'Odonto - Confirmação D-3, D-2, D-0',
    bu:       'Odonto',
    emails: [
      'ODONTO | 2025 - Confirmação de Consulta Odontológica D3',
      'ODONTO | 2025 - Confirmação de Consulta Odontológica D2',
      'AS | Consulta Agendada - Lembrete (Odonto)',
    ],
  },
  {
    flowId:   '1813618226',
    flowName: 'Med - Recuperação de Agendamentos Cancelados',
    bu:       'Medicina',
    emails: [
      'AS | 2026 - Recuperação de Agendamentos Cancelados - D0',
      'AS | 2026 - Recuperação de Agendamentos Cancelados - D2',
      'AS | 2026 - Recuperação de Agendamentos Cancelados - D7',
    ],
  },
  {
    flowId:   '1830371404',
    flowName: 'Odonto - Recuperação de Agendamentos Cancelados',
    bu:       'Odonto',
    emails: [
      'ODONTO | 2026 - Recuperação de Agendamentos Cancelados - D0',
      'ODONTO | 2026 - Recuperação de Agendamentos Cancelados - D2',
    ],
  },
  {
    flowId:   '1618709668',
    flowName: 'Med - Pesquisa de Satisfação NPS',
    bu:       'Medicina',
    emails: [
      'AS | Pesquisa de satisfação e-mail - AMEI',
    ],
  },
  {
    flowId:   '1691190834',
    flowName: 'Odonto - Jornada Pós-Consulta',
    bu:       'Odonto',
    emails: [
      'ODONTO | 2025 - Pós-consulta',
      'ODONTO | 2025 - Pós Consulta - A',
      'ODONTO | 2025 - Pós Consulta - B',
    ],
  },
  {
    flowId:   '1677450936',
    flowName: 'Med - Pós Consulta AMEI',
    bu:       'Medicina',
    emails: [
      'AS | 2025 - Pós Consulta 01 - A',
      'AS | 2025 - Pós Consulta 02 - A',
      'AS | 2025 - Pós Consulta 03 - A',
      'AS | 2025 - Pós Consulta 04 - A',
    ],
    // Versões CTAs Exames existem no Athena com nome diferente
    athenaCampaigns: [
      'AS | 2025 - Pós Consulta 01 - A',
      'AS | 2025 - Pós Consulta 02 - A',
      'AS | 2025 - Pós Consulta 03 - A',
      'AS | 2025 - Pós Consulta 04 - A',
      'AS | 2026 - Pós Consulta 01 - CTAs Exames',
      'AS | 2026 - Pós Consulta 02 - CTAs Exames',
      'AS | 2026 - Pós Consulta 03 - CTAs Exames',
      'AS | 2026 - Pós Consulta 04 - CTAs Exames',
    ],
  },
  {
    flowId:   '1658736508',
    flowName: 'Odonto - Não Compareceu / DentalVidas',
    bu:       'Odonto',
    emails: [
      'ODONTO | 2025 - No Show Odontologia',
      'ODONTO | Dental Vidas | Apresentando Plano Dental Vidas',
    ],
  },
  {
    // Nomes HubSpot ≠ nomes Athena — emailNameMap faz a ponte
    flowId:   '1618894127',
    flowName: 'Med - Fluxo Não Compareceu + Pesquisa NPS',
    bu:       'Medicina',
    emails: [
      'AS | Pesquisa Não Compareceu - AMEI',
      'AS | Motivo 1;2;4;5 - No Show - Remarque sua consulta - Nacional - AMEI',
      'AS | Motivo 3 - No Show - Agende sua consulta Nacional - AMEI',
      'AS | 2024 - No Show - Não Respondeu - Nacional - AMEI',
      'AS | 2024 - Não comparecimento - Agende sua consulta - Não Respondeu 2 - AMEI',
    ],
    athenaCampaigns: [
      'AS | Pesquisa Não Compareceu - AMEI',
      'AS | No show - Motivo 1,2,4 e 5 - AMEI',
      'AS | No show - Motivo 3 - AMEI',
      'AS | 2024 - No Show - Não Respondeu - Nacional',
      'AS | No show - Não respondeu 2 - AMEI',
    ],
    // Mapa HubSpot → Athena por e-mail individual
    emailNameMap: {
      'AS | Motivo 1;2;4;5 - No Show - Remarque sua consulta - Nacional - AMEI': 'AS | No show - Motivo 1,2,4 e 5 - AMEI',
      'AS | Motivo 3 - No Show - Agende sua consulta Nacional - AMEI':            'AS | No show - Motivo 3 - AMEI',
      'AS | 2024 - No Show - Não Respondeu - Nacional - AMEI':                    'AS | 2024 - No Show - Não Respondeu - Nacional',
      'AS | 2024 - Não comparecimento - Agende sua consulta - Não Respondeu 2 - AMEI': 'AS | No show - Não respondeu 2 - AMEI',
    },
  },
  {
    flowId:   '1787370568',
    flowName: 'Onboarding - Recuperação de Indecisos',
    bu:       'Medicina',
    emails: [
      'AS | 2026 - Onboarding D10 - Telemedicina',
      'AS | 2026 - Onboarding D16 - Depoimentos',
      'AS | 2026 - Onboarding D21- Telemedicina',
      'AS | 2026 - Onboarding D30 - Gestão de Confiança',
    ],
  },
  {
    flowId:   '1805915530',
    flowName: 'Telemedicina CDT Anual',
    bu:       'Medicina',
    emails: [
      'AS | Telemedicina - junho 2026 (CDT)',
      'AS | Telemedicina - abril 2026 (CDT)',
    ],
    athenaCampaigns: [
      'AS | Telemedicina - junho 2026 (CDT)',
      'AS | Telemedicina - abril 2026 (CDT)',
      'AS | Telemedicina - maio 2026 (CDT)',
    ],
  },
  {
    flowId:   '1607996991',
    flowName: 'Odonto - Apresentando Odontologia MKT',
    bu:       'Odonto',
    emails: [
      'AS | 2024 - Apresentando o serviço de odontologia do AmorSaúde',
    ],
  },
  {
    flowId:   '1807912856',
    flowName: 'Odonto - Reativação de Paciente',
    bu:       'Odonto',
    emails: [
      'ODONTO | 2026 - Reativação pacientes - Limpeza Semestral',
      'ODONTO | 2026 - Migração de Prótese para Implante',
    ],
  },
  {
    flowId:   '612141145',
    flowName: 'Med - Dicas de Saúde - Psicologia e Psiquiatria',
    bu:       'Medicina',
    emails: [
      'AS | 2024 - Dicas de Saúde Psicologia - Email 01',
      'AS | 2024 - Dicas de Saúde Psicologia - Email 02',
      'AS | 2024 - Dicas de Saúde Psicologia - Email 03',
    ],
  },
  {
    flowId:   '1783232539',
    flowName: 'Med - Pesquisa de Pós Consulta',
    bu:       'Medicina',
    emails: [
      'AS | Pesquisa Pós Consulta (Nova)',
    ],
  },
  {
    flowId:   '1717076232',
    flowName: 'Odonto - Pesquisa de Satisfação NPS',
    bu:       'Odonto',
    emails: [
      'AS | Pesquisa de satisfação Odonto e-mail',
    ],
  },
  {
    flowId:   '564490328',
    flowName: 'Med - Jornada App / Agendamento',
    bu:       'Medicina',
    emails: [
      'AS | Jornada APP - Clientes que possuem Aplicativo',
    ],
  },
  {
    flowId:   '569753263',
    flowName: 'Onboarding Unificado',
    bu:       'Ambos',
    emails: [
      'AS | 2026 - Onboarding D2 - Medicina',
      'AS | 2026 - Onboarding D3 - Exames',
      'AS | 2026 - Onboarding D5 - Odontologia',
      'AS | 2026 - Onboarding D7 - Telemedicina',
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

// Retorna nomes Athena do fluxo (athenaCampaigns ?? emails)
export function getAthenaCampaigns(flow) {
  return flow.athenaCampaigns || flow.emails;
}

// Retorna nome Athena de um e-mail específico do fluxo
// Se não houver mapa, retorna o próprio nome
export function getAthenaName(flow, hubspotName) {
  if (flow.emailNameMap && flow.emailNameMap[hubspotName]) {
    return flow.emailNameMap[hubspotName];
  }
  return hubspotName;
}

// Todos os nomes Athena para a query 16501
export function getAllAthenaCampaigns() {
  return [...new Set(FLOW_MAP.flatMap(f => getAthenaCampaigns(f)))];
}

// Filtra por BU
export function getFlowsByBU(bu) {
  if (!bu || bu === 'todos') return FLOW_MAP;
  return FLOW_MAP.filter(f => f.bu === bu || f.bu === 'Ambos');
}
