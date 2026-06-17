import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

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
      model: 'claude-sonnet-4-6',
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

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'crm-dashboard' }));
app.get('*', (_, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
app.listen(PORT, () => console.log(`CRM Dashboard na porta ${PORT}`));
