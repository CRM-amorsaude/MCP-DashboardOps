# hubspot-crm-mcp

MCP Server para monitoramento operacional e estratégico do CRM AmorSaúde.
Expõe endpoints da HubSpot API como tools para o Claude e para jobs n8n.

## Tools disponíveis

| Tool | Descrição |
|---|---|
| `hubspot_list_workflows` | Lista todos os fluxos de automação do portal |
| `hubspot_get_workflow_performance` | Contagem diária de inscrições por fluxo e período |
| `hubspot_detect_enrollment_anomaly` | Compara enrollments do dia com média 7d e detecta quedas |
| `hubspot_list_emails` | Lista e-mails de marketing com id e hs_name |
| `hubspot_get_email_histogram` | Métricas diárias por e-mail (enviados, abertos, cliques, bounces) |
| `hubspot_get_email_statistics` | Estatísticas agregadas por e-mail para um período |

## Variáveis de ambiente

```env
HUBSPOT_API_TOKEN=seu_private_app_token
PORT=3000
TRANSPORT=http
```

## Scopes necessários no Private App HubSpot

- `automation` — acesso à Automation API v4
- `marketing-email` — acesso às estatísticas de e-mail marketing
- `crm.objects.contacts.read` — complementar para CRM Search

## Deploy no Railway

1. Conectar repositório no Railway
2. Configurar variáveis de ambiente acima
3. Railway detecta automaticamente o `Procfile` e executa `node dist/index.js`
4. O endpoint MCP ficará disponível em `https://seu-servico.railway.app/mcp`

## Uso local

```bash
npm install
npm run build
HUBSPOT_API_TOKEN=xxx TRANSPORT=http npm start
```

## Conectar no Claude.ai

Settings → Integrations → Add MCP Server
URL: `https://seu-servico.railway.app/mcp`

## Endpoint de saúde

`GET /health` — retorna `{ status: "ok" }` para health check do Railway.
