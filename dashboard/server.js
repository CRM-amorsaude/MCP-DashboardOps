import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

const METABASE_URL  = process.env.METABASE_URL  || 'https://amorsaude.metabaseapp.com';
const METABASE_USER = process.env.METABASE_USER || '';
const METABASE_PASS = process.env.METABASE_PASS || '';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ── Metabase auth header ─────────────────────────────────────────────────
const METABASE_API_KEY = process.env.METABASE_API_KEY || '';

async function metabaseHeaders() {
  if (METABASE_API_KEY) {
    return { 'Content-Type': 'application/json', 'X-API-Key': METABASE_API_KEY };
  }
  const res = await fetch(`${METABASE_URL}/api/session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: METABASE_USER, password: METABASE_PASS }),
  });
  if (!res.ok) throw new Error(`Metabase auth failed: ${res.status}`);
  const { id } = await res.json();
  return { 'Content-Type': 'application/json', 'X-Metabase-Session': id };
}

// ── /api/attribution ──────────────────────────────────────────────────────
app.post('/api/attribution', async (req, res) => {
  const { startDate, endDate, emails, erp } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
  }
  if (!METABASE_API_KEY && (!METABASE_USER || !METABASE_PASS)) {
    return res.status(500).json({ error: 'Configure METABASE_API_KEY ou METABASE_USER + METABASE_PASS' });
  }

  try {
    const mbHeaders = await metabaseHeaders();

    const campaignList = (emails || [])
      .map(c => `'${c.replace(/'/g, "''")}'`)
      .join(',');

    const whereEmails = campaignList
      ? `AND nm_campanha IN (${campaignList})`
      : '';

    const whereErp = erp && erp !== 'todos'
      ? erp === 'medicina'
        ? `AND erp IN ('Amei', 'Amei!')`
        : erp === 'odontologia'
          ? `AND erp IN ('Webdental', 'Webvidas')`
          : ''
      : '';

    const sql = `
      SELECT
        nm_campanha,
        erp,
        nm_convenio,
        nm_canal,
        origem_descricao,
        nm_especialidade,
        nm_status,
        CAST(dt_criacao AS DATE)     AS data_referencia,
        COUNT(*)                     AS conversoes,
        COALESCE(SUM(valor), 0)      AS receita_atribuida,
        ROUND(AVG(valor), 2)         AS ticket_medio
      FROM pdgt_amorsaude_marketing.fl_cruzamento_campanhas_hubspot
      WHERE rn = 1
        AND CAST(dt_criacao AS DATE) >= DATE '${startDate}'
        AND CAST(dt_criacao AS DATE) <= DATE '${endDate}'
        ${whereEmails}
        ${whereErp}
      GROUP BY
        nm_campanha, erp, nm_convenio, nm_canal,
        origem_descricao, nm_especialidade, nm_status,
        CAST(dt_criacao AS DATE)
      ORDER BY receita_atribuida DESC
    `;

    const queryRes = await fetch(`${METABASE_URL}/api/dataset`, {
      method:  'POST',
      headers: mbHeaders,
      body: JSON.stringify({
        database: 68,
        type:     'native',
        native:   { query: sql },
      }),
    });

    if (!queryRes.ok) throw new Error(`Metabase query failed: ${queryRes.status}`);

    const raw = await queryRes.json();
    const cols = raw?.data?.cols?.map(c => c.name) || [];
    const rows = (raw?.data?.rows || []).map(row => {
      const obj = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('/api/attribution error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/cvortex ─────────────────────────────────────────────────────────
app.post('/api/cvortex', async (req, res) => {
  const { startDate, endDate, bu = 'todos' } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
  }
  if (!METABASE_API_KEY && (!METABASE_USER || !METABASE_PASS)) {
    return res.status(500).json({ error: 'Configure METABASE_API_KEY ou METABASE_USER + METABASE_PASS' });
  }

  const params = [
    { type: 'category', target: ['variable', ['template-tag', 'data_inicio']], value: startDate },
    { type: 'category', target: ['variable', ['template-tag', 'data_fim']],    value: endDate   },
  ];

  async function queryQuestion(id, buLabel) {
    const headers = await metabaseHeaders();
    const res2  = await fetch(`${METABASE_URL}/api/card/${id}/query/json`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ parameters: params }),
    });
    if (!res2.ok) throw new Error(`Metabase question ${id} failed: ${res2.status}`);
    const rows = await res2.json();
    return rows.map(r => ({ ...r, bu: buLabel }));
  }

  try {
    let rows = [];
    if (bu === 'todos' || bu === 'odontologia') {
      const odonto = await queryQuestion(16831, 'odontologia');
      rows = rows.concat(odonto);
    }
    if (bu === 'todos' || bu === 'medicina') {
      const med = await queryQuestion(16832, 'medicina');
      rows = rows.concat(med);
    }
    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('/api/cvortex error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/chat (OpenAI streaming) ─────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.chat.completions.create({
      model:      'gpt-4o',
      max_tokens: 2048,
      stream:     true,
      messages: [
        {
          role:    'system',
          content: `Você é o Agente Analista CRM do AmorSaúde, especialista em análise de dados de CRM e marketing.
Analise dados de fluxos de automação HubSpot, métricas de e-mails e atribuição de conversões por campanha.
Seja direto, analítico e oriente suas respostas para insights de negócio. Responda sempre em português brasileiro.`,
        },
        ...messages,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
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
