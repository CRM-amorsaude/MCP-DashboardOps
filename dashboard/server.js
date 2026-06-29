import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

const METABASE_URL     = process.env.METABASE_URL  || 'https://amorsaude.metabaseapp.com';
const METABASE_USER    = process.env.METABASE_USER || '';
const METABASE_PASS    = process.env.METABASE_PASS || '';
const METABASE_API_KEY = process.env.METABASE_API_KEY || '';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ── Supabase client (server-side) ─────────────────────────────────────────
function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

// ── Metabase auth ─────────────────────────────────────────────────────────
async function metabaseHeaders() {
  if (METABASE_API_KEY) {
    return { 'Content-Type': 'application/json', 'X-API-Key': METABASE_API_KEY };
  }
  const res = await fetch(`${METABASE_URL}/api/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: METABASE_USER, password: METABASE_PASS }),
  });
  if (!res.ok) throw new Error(`Metabase auth failed: ${res.status}`);
  const { id } = await res.json();
  return { 'Content-Type': 'application/json', 'X-Metabase-Session': id };
}

// ── Ferramentas do agente ─────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultar_metricas_email',
      description: 'Retorna métricas agregadas de e-mails HubSpot: taxa de abertura, entrega, clique, bounce e spam por campanha. Use para perguntas sobre performance de e-mails, engajamento ou comparação entre campanhas.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Data início (yyyy-MM-dd)' },
          end_date:   { type: 'string', description: 'Data fim (yyyy-MM-dd)' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_fluxos_hubspot',
      description: 'Retorna inscrições totais nos fluxos de automação HubSpot no período. Use para perguntas sobre volume de inscrições, tendências ou quedas em fluxos.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Data início (yyyy-MM-dd)' },
          end_date:   { type: 'string', description: 'Data fim (yyyy-MM-dd)' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_atribuicao_campanhas',
      description: 'Retorna atribuição por campanha: agendamentos, atendimentos, propostas pagas e faturamento. Use para ROI, receita, top campanhas ou comparação. Se o usuário perguntar sobre UMA campanha específica (ex: "por que a campanha X está zerada?"), passe o nome em campanha para receber o detalhamento por origem e status, que explica zeros.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Data início (yyyy-MM-dd)' },
          end_date:   { type: 'string', description: 'Data fim (yyyy-MM-dd)' },
          bu: { type: 'string', enum: ['todos', 'medicina', 'odontologia'], description: 'Filtrar por BU' },
          campanha: { type: 'string', description: 'Opcional. Nome (ou parte) de uma campanha para diagnóstico detalhado por origem/status.' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_confirmacoes',
      description: 'Retorna confirmações de consulta por canal (WhatsApp, E-mail, Push) e taxa de conversão para atendidos. Use para taxa de confirmação, conversão de agendamentos ou comparação entre canais.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Data início (yyyy-MM-dd)' },
          end_date:   { type: 'string', description: 'Data fim (yyyy-MM-dd)' },
          bu: { type: 'string', enum: ['todos', 'Medicina', 'Odonto'], description: 'Filtrar por BU' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_cvortex',
      description: 'Retorna propostas e receita pós-consulta via cVortex (WhatsApp): propostas Medicina por situação de pagamento e tratamentos Odonto por tipo. Use para pós-consulta, propostas WhatsApp ou receita cVortex.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Data início (yyyy-MM-dd)' },
          end_date:   { type: 'string', description: 'Data fim (yyyy-MM-dd)' },
          bu: { type: 'string', enum: ['todos', 'medicina', 'odontologia'], description: 'Filtrar por BU' },
        },
        required: ['start_date', 'end_date'],
      },
    },
  },
];

const TOOL_STATUS = {
  consultar_metricas_email:       'Consultando métricas de e-mail...',
  consultar_fluxos_hubspot:       'Consultando fluxos HubSpot...',
  consultar_atribuicao_campanhas: 'Consultando atribuição de campanhas...',
  consultar_confirmacoes:         'Consultando confirmações...',
  consultar_cvortex:              'Consultando dados cVortex...',
};

function fmtBRL(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

async function executeTool(name, args) {
  const sb = getSupabase();

  if (name === 'consultar_metricas_email') {
    const { data = [] } = await sb
      .from('hs_email_metrics')
      .select('hs_name, sent, delivered, opened, clicked, bounced_hard, spam_reports')
      .gte('date', args.start_date)
      .lte('date', args.end_date);

    const agg = {};
    for (const r of data) {
      if (!agg[r.hs_name]) agg[r.hs_name] = { hs_name: r.hs_name, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced_hard: 0, spam_reports: 0 };
      agg[r.hs_name].sent          += r.sent          || 0;
      agg[r.hs_name].delivered     += r.delivered     || 0;
      agg[r.hs_name].opened        += r.opened        || 0;
      agg[r.hs_name].clicked       += r.clicked       || 0;
      agg[r.hs_name].bounced_hard  += r.bounced_hard  || 0;
      agg[r.hs_name].spam_reports  += r.spam_reports  || 0;
    }

    return Object.values(agg).map(r => ({
      campanha:      r.hs_name,
      enviados:      r.sent,
      abertos:       r.opened,
      cliques:       r.clicked,
      taxa_abertura: r.delivered > 0 ? ((r.opened / r.delivered) * 100).toFixed(1) + '%' : '0%',
      taxa_clique:   r.delivered > 0 ? ((r.clicked / r.delivered) * 100).toFixed(1) + '%' : '0%',
      taxa_bounce:   r.sent > 0 ? ((r.bounced_hard / r.sent) * 100).toFixed(2) + '%' : '0%',
      taxa_spam:     r.sent > 0 ? ((r.spam_reports / r.sent) * 100).toFixed(3) + '%' : '0%',
    })).sort((a, b) => b.abertos - a.abertos).slice(0, 25);
  }

  if (name === 'consultar_fluxos_hubspot') {
    const { data = [] } = await sb
      .from('hs_workflow_enrollments')
      .select('flow_name, enrollments')
      .gte('date', args.start_date)
      .lte('date', args.end_date);

    const agg = {};
    for (const r of data) {
      if (!agg[r.flow_name]) agg[r.flow_name] = { fluxo: r.flow_name, total_inscricoes: 0 };
      agg[r.flow_name].total_inscricoes += r.enrollments || 0;
    }
    return Object.values(agg).sort((a, b) => b.total_inscricoes - a.total_inscricoes).slice(0, 20);
  }

  if (name === 'consultar_atribuicao_campanhas') {
    const bu = ['medicina', 'odontologia'].includes(args.bu) ? args.bu : 'todos';

    // Diagnóstico de UMA campanha: detalha por origem + status para explicar zeros
    if (args.campanha) {
      const { data: det = [] } = await sb
        .from('campaign_attribution_detail')
        .select('nm_campanha, origem_descricao, nm_status, conversoes, receita_atribuida, data_referencia')
        .ilike('nm_campanha', `%${args.campanha}%`)
        .gte('data_referencia', args.start_date)
        .lte('data_referencia', args.end_date)
        .limit(100000);

      if (det.length === 0) {
        return {
          aviso: `Nenhum registro para "${args.campanha}" no período ${args.start_date} a ${args.end_date}.`,
          dica: 'A campanha pode não ter gerado conversões nesse período. Tente uma janela maior (ex: 90 dias) ou confira o nome exato.',
        };
      }

      // Distribuição por origem + status no período
      const porOrigem = {};
      let minData = null, maxData = null;
      for (const r of det) {
        const k = `${r.origem_descricao} | ${r.nm_status}`;
        if (!porOrigem[k]) porOrigem[k] = { origem: r.origem_descricao, status: r.nm_status, conversoes: 0, receita: 0 };
        porOrigem[k].conversoes += r.conversoes || 0;
        porOrigem[k].receita    += r.receita_atribuida || 0;
        if (!minData || r.data_referencia < minData) minData = r.data_referencia;
        if (!maxData || r.data_referencia > maxData) maxData = r.data_referencia;
      }

      return {
        campanha: args.campanha,
        periodo: `${args.start_date} a ${args.end_date}`,
        data_referencia_min: minData,
        data_referencia_max: maxData,
        detalhamento: Object.values(porOrigem)
          .map(r => ({ ...r, receita: fmtBRL(r.receita) }))
          .sort((a, b) => b.conversoes - a.conversoes),
        nota: 'Agendamentos = origens Agendamento/Atendimento. Atendimentos = (Atendimento+Quitadas) ou (Agendamento+Atendido). Se agendamentos estão zerados mas há registros, verifique as datas: a campanha pode ter parado de gerar conversões fora da janela selecionada.',
      };
    }

    // Visão geral por campanha via RPC (consistente com o dashboard)
    const { data = [], error } = await sb.rpc('rpc_attribution_por_campanha', {
      p_start: args.start_date, p_end: args.end_date, p_bu: bu,
    });
    if (error) return { erro: error.message };

    return (data || [])
      .map(r => ({
        campanha:     r.nm_campanha,
        agendamentos: r.agendamentos,
        atendimentos: r.atendimentos,
        propostas_pagas: r.qt_propostas_pagas,
        fat_total:    fmtBRL(r.fat_total),
        ticket_medio: r.qt_propostas_pagas > 0 ? fmtBRL(Number(r.fat_total) / r.qt_propostas_pagas) : 'R$ 0,00',
      }))
      .sort((a, b) => Number(b.fat_total.replace(/[^0-9,]/g,'').replace(',','.')) - Number(a.fat_total.replace(/[^0-9,]/g,'').replace(',','.')))
      .slice(0, 20);
  }

  if (name === 'consultar_confirmacoes') {
    let query = sb
      .from('confirmacoes')
      .select('canal, bu, status_agendamento, confirmacoes')
      .gte('data_referencia', args.start_date)
      .lte('data_referencia', args.end_date);

    if (args.bu && args.bu !== 'todos') query = query.eq('bu', args.bu);

    const { data = [] } = await query;

    const agg = {};
    for (const r of data) {
      const k = `${r.canal}|${r.bu}`;
      if (!agg[k]) agg[k] = { canal: r.canal, bu: r.bu, confirmacoes: 0, atendidos: 0 };
      agg[k].confirmacoes += r.confirmacoes || 0;
      if (r.status_agendamento === 'Atendido') agg[k].atendidos += r.confirmacoes || 0;
    }

    return Object.values(agg).map(r => ({
      ...r,
      taxa_conversao: r.confirmacoes > 0 ? ((r.atendidos / r.confirmacoes) * 100).toFixed(1) + '%' : '0%',
    }));
  }

  if (name === 'consultar_cvortex') {
    let query = sb
      .from('cvortex_pos_consulta')
      .select('bu, situacao_pagamento, tipo_tratamento, conversoes, receita')
      .gte('data_referencia', args.start_date)
      .lte('data_referencia', args.end_date);

    if (args.bu && args.bu !== 'todos') query = query.eq('bu', args.bu);

    const { data = [] } = await query.limit(200000);

    const totals   = { medicina: { conversoes: 0, receita: 0 }, odontologia: { conversoes: 0, receita: 0 } };
    const byStatus = {};
    const byTipo   = {};

    for (const r of data) {
      totals[r.bu].conversoes += r.conversoes || 0;
      totals[r.bu].receita    += r.receita    || 0;

      if (r.bu === 'medicina' && r.situacao_pagamento) {
        if (!byStatus[r.situacao_pagamento]) byStatus[r.situacao_pagamento] = { conversoes: 0, receita: 0 };
        byStatus[r.situacao_pagamento].conversoes += r.conversoes || 0;
        byStatus[r.situacao_pagamento].receita    += r.receita    || 0;
      }
      if (r.bu === 'odontologia' && r.tipo_tratamento) {
        if (!byTipo[r.tipo_tratamento]) byTipo[r.tipo_tratamento] = { conversoes: 0, receita: 0 };
        byTipo[r.tipo_tratamento].conversoes += r.conversoes || 0;
        byTipo[r.tipo_tratamento].receita    += r.receita    || 0;
      }
    }

    return {
      medicina:    { conversoes: totals.medicina.conversoes,    receita: fmtBRL(totals.medicina.receita) },
      odontologia: { conversoes: totals.odontologia.conversoes, receita: fmtBRL(totals.odontologia.receita) },
      medicina_por_status:    Object.entries(byStatus).map(([k, v]) => ({ status: k, conversoes: v.conversoes, receita: fmtBRL(v.receita) })).sort((a, b) => b.conversoes - a.conversoes),
      odontologia_por_tipo:   Object.entries(byTipo).map(([k, v])   => ({ tipo:   k, conversoes: v.conversoes, receita: fmtBRL(v.receita) })).sort((a, b) => b.conversoes - a.conversoes),
    };
  }

  return { erro: `Ferramenta desconhecida: ${name}` };
}

// ── /api/attribution ──────────────────────────────────────────────────────
app.post('/api/attribution', async (req, res) => {
  const { startDate, endDate, emails, erp } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });

  try {
    const mbHeaders = await metabaseHeaders();
    const campaignList = (emails || []).map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    const whereEmails = campaignList ? `AND nm_campanha IN (${campaignList})` : '';
    const whereErp = erp === 'medicina' ? `AND erp IN ('Amei', 'Amei!')` : erp === 'odontologia' ? `AND erp IN ('Webdental', 'Webvidas')` : '';

    const sql = `
      SELECT nm_campanha, erp, nm_convenio, nm_canal, origem_descricao, nm_especialidade, nm_status,
        CAST(dt_criacao AS DATE) AS data_referencia,
        COUNT(*) AS conversoes, COALESCE(SUM(valor), 0) AS receita_atribuida, ROUND(AVG(valor), 2) AS ticket_medio
      FROM pdgt_amorsaude_marketing.fl_cruzamento_campanhas_hubspot
      WHERE rn = 1
        AND CAST(dt_criacao AS DATE) >= DATE '${startDate}'
        AND CAST(dt_criacao AS DATE) <= DATE '${endDate}'
        ${whereEmails} ${whereErp}
      GROUP BY nm_campanha, erp, nm_convenio, nm_canal, origem_descricao, nm_especialidade, nm_status, CAST(dt_criacao AS DATE)
      ORDER BY receita_atribuida DESC`;

    const queryRes = await fetch(`${METABASE_URL}/api/dataset`, {
      method: 'POST', headers: mbHeaders,
      body: JSON.stringify({ database: 68, type: 'native', native: { query: sql } }),
    });
    if (!queryRes.ok) throw new Error(`Metabase query failed: ${queryRes.status}`);
    const raw  = await queryRes.json();
    const cols = raw?.data?.cols?.map(c => c.name) || [];
    const rows = (raw?.data?.rows || []).map(row => { const obj = {}; cols.forEach((col, i) => { obj[col] = row[i]; }); return obj; });
    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('/api/attribution error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/cvortex ─────────────────────────────────────────────────────────
app.post('/api/cvortex', async (req, res) => {
  const { startDate, endDate, bu = 'todos' } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });

  const params = [
    { type: 'category', target: ['variable', ['template-tag', 'data_inicio']], value: startDate },
    { type: 'category', target: ['variable', ['template-tag', 'data_fim']],    value: endDate   },
  ];

  async function queryQuestion(id, buLabel) {
    const headers = await metabaseHeaders();
    const r = await fetch(`${METABASE_URL}/api/card/${id}/query/json`, { method: 'POST', headers, body: JSON.stringify({ parameters: params }) });
    if (!r.ok) throw new Error(`Metabase question ${id} failed: ${r.status}`);
    return (await r.json()).map(row => ({ ...row, bu: buLabel }));
  }

  try {
    let rows = [];
    if (bu === 'todos' || bu === 'odontologia') rows = rows.concat(await queryQuestion(16831, 'odontologia'));
    if (bu === 'todos' || bu === 'medicina')    rows = rows.concat(await queryQuestion(16832, 'medicina'));
    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('/api/cvortex error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/chat (OpenAI + tool calling) ─────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const today  = new Date().toISOString().split('T')[0];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const systemMsg = {
    role: 'system',
    content: `Você é o Agente Analista CRM do AmorSaúde, maior rede de clínicas do Brasil (mais de 500 unidades).
Data de hoje: ${today}.

Você tem acesso a ferramentas que consultam dados reais do CRM:
- consultar_metricas_email: métricas de e-mails HubSpot (abertura, clique, bounce, spam)
- consultar_fluxos_hubspot: inscrições nos fluxos de automação
- consultar_atribuicao_campanhas: receita e conversões por campanha. Para diagnosticar UMA campanha (ex: "por que X está zerada?"), passe o parâmetro campanha e receba o detalhamento por origem/status + datas min/max.
- consultar_confirmacoes: confirmações de consulta por canal (WhatsApp, E-mail, Push) e taxa de conversão
- consultar_cvortex: propostas e receita pós-consulta via cVortex (WhatsApp)

REGRAS:
- Sempre use as ferramentas para buscar dados reais antes de responder perguntas analíticas.
- Quando o período não for especificado, use os últimos 30 dias.
- Cite os números reais retornados pelas ferramentas na sua resposta.
- Seja direto e oriente a resposta para insights de negócio acionáveis.
- Formate valores monetários em Real brasileiro (R$ 1.234,56).
- Responda sempre em português brasileiro.

CONHECIMENTO SOBRE ATRIBUIÇÃO (importante para a diretoria):
- A janela de atribuição é de 7 dias para agendamento/atendimento e 45 dias para pós-consulta. O dashboard filtra pela data_referencia (data de criação da consulta).
- Uma campanha pode aparecer com agendamentos ZERADOS por motivos legítimos, não por erro: (1) parou de gerar conversões antes da janela selecionada — verifique data_referencia_max no detalhamento; (2) é uma campanha antiga/descontinuada com pouquíssimos registros; (3) é um e-mail de pesquisa/NPS que não gera agendamento por natureza.
- Quando perguntarem por que uma campanha está zerada, use consultar_atribuicao_campanhas com o parâmetro campanha, analise as datas e o detalhamento por origem, e explique a causa provável. Sugira ampliar o período se os dados estiverem fora da janela.
- Atendimento conta como: origem 'Atendimento' com status 'Quitadas', OU origem 'Agendamento' com status 'Atendido'. Nem toda campanha registra do mesmo jeito.`,
  };

  try {
    // Passo 1: Decisão de ferramenta (sem streaming)
    const decision = await client.chat.completions.create({
      model:        'gpt-4o',
      max_tokens:   512,
      messages:     [systemMsg, ...messages],
      tools:        TOOLS,
      tool_choice:  'auto',
    });

    const choice      = decision.choices[0];
    const allMessages = [systemMsg, ...messages, choice.message];

    // Passo 2: Executar ferramentas se necessário
    if (choice.finish_reason === 'tool_calls') {
      for (const tc of choice.message.tool_calls) {
        // Informa o frontend qual dado está sendo buscado
        const statusMsg = TOOL_STATUS[tc.function.name] || 'Consultando dados...';
        res.write(`data: ${JSON.stringify({ status: statusMsg })}\n\n`);

        try {
          const args   = JSON.parse(tc.function.arguments);
          const result = await executeTool(tc.function.name, args);
          allMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        } catch (toolErr) {
          allMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ erro: toolErr.message }) });
        }
      }
    }

    // Passo 3: Resposta final em streaming
    const stream = await client.chat.completions.create({
      model:      'gpt-4o',
      max_tokens: 2048,
      stream:     true,
      messages:   allMessages,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Health + SPA fallback ─────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.get('*', (_, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`CRM Dashboard na porta ${PORT}`));
