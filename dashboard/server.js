import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

const METABASE_URL  = process.env.METABASE_URL  || 'https://amorsaude.metabaseapp.com';
const METABASE_USER = process.env.METABASE_USER || '';
const METABASE_PASS = process.env.METABASE_PASS || '';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ── Metabase session helper ───────────────────────────────────────────────
async function metabaseSession() {
  const res = await fetch(`${METABASE_URL}/api/session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: METABASE_USER, password: METABASE_PASS }),
  });
  if (!res.ok) throw new Error(`Metabase auth failed: ${res.status}`);
  const { id } = await res.json();
  return id;
}

// ── /api/attribution ──────────────────────────────────────────────────────
// Consulta fl_cruzamento_campanhas_hubspot via Metabase com filtro dinâmico
// Body: { startDate, endDate, flowIds?, erp? }
app.post('/api/attribution', async (req, res) => {
  const { startDate, endDate, emails, erp } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
  }
  if (!METABASE_USER || !METABASE_PASS) {
    return res.status(500).json({ error: 'Credenciais do Metabase não configuradas' });
  }

  try {
    const token = await metabaseSession();

    // Lista de campanhas para filtrar (vem do flowMap via frontend)
    const campaignList = (emails || [])
      .map(c => `'${c.replace(/'/g, "''")}'`)
      .join(',');

    const whereEmails = campaignList
      ? `AND nm_campanha IN (${campaignList})`
      : '';

    const whereErp = erp && erp !== 'todos'
      ? `AND erp = '${erp}'`
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
      headers: {
        'Content-Type':       'application/json',
        'X-Metabase-Session': token,
      },
      body: JSON.stringify({
        database: 68,
        type:     'native',
        native:   { query: sql },
      }),
    });

    if (!queryRes.ok) throw new Error(`Metabase query failed: ${queryRes.status}`);

    const raw = await queryRes.json();

    // Transforma o formato colunas/linhas do Metabase em array de objetos
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

// ── /api/chat (Claude streaming) ─────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `Você é o Agente Analista CRM do AmorSaúde, especialista em análise de dados de CRM e marketing.
Analise dados de fluxos de automação HubSpot, métricas de e-mails e atribuição de conversões por campanha.
Seja direto, analítico e oriente suas respostas para insights de negócio. Responda sempre em português brasileiro.`,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
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
