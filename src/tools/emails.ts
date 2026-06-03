import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getHubSpotClient,
  handleHubSpotError,
  toTimestampMs,
  bucketToDate,
  safeRate,
} from "../services/hubspot.js";
import {
  HubSpotEmailsResponse,
  HubSpotHistogramResponse,
  EmailMetricsDay,
} from "../types.js";
import { DEFAULT_PAGE_LIMIT } from "../constants.js";

// Extrai contadores normalizados do objeto de estatísticas HubSpot
// A API retorna chaves em diferentes formatos dependendo do endpoint
function extractCounters(stats: Record<string, number> | undefined) {
  if (!stats) return { sent: 0, delivered: 0, opened: 0, clicked: 0 };
  return {
    sent:      stats["SENT"]      ?? stats["sent"]      ?? 0,
    delivered: stats["DELIVERED"] ?? stats["delivered"] ?? 0,
    opened:    stats["OPEN"]      ?? stats["open"]      ?? stats["opened"] ?? 0,
    clicked:   stats["CLICK"]     ?? stats["click"]     ?? stats["clicked"] ?? 0,
  };
}

function extractQualifiers(stats: Record<string, number> | undefined) {
  if (!stats) return { bounced_hard: 0, bounced_soft: 0, unsubscribed: 0, spam_reports: 0 };
  return {
    bounced_hard:  stats["HARD_BOUNCED"]  ?? stats["hardBounced"]  ?? stats["BOUNCE"]  ?? 0,
    bounced_soft:  stats["SOFT_BOUNCED"]  ?? stats["softBounced"]  ?? 0,
    unsubscribed:  stats["UNSUBSCRIBED"]  ?? stats["unsubscribed"] ?? 0,
    spam_reports:  stats["SPAM_REPORT"]   ?? stats["spamReport"]   ?? stats["SPAM"]    ?? 0,
  };
}

export function registerEmailTools(server: McpServer): void {

  // ── 1. Listar e-mails de marketing ─────────────────────────────────────

  server.registerTool(
    "hubspot_list_emails",
    {
      title: "Listar E-mails de Marketing HubSpot",
      description: `Lista os e-mails de marketing do portal HubSpot.

Retorna id, nome (hs_name), assunto, estado e data de publicação.
Use para descobrir email_ids e hs_names antes de buscar métricas detalhadas.
O campo hs_name é a chave de join com nm_campanha na tabela de atribuição do Athena.

Args:
  - state (string): Filtra por estado do e-mail. Opções: DRAFT, SCHEDULED, PUBLISHED, ARCHIVED, ALL. Default: PUBLISHED
  - limit (number): Máximo de resultados, 1-100. Default: 100
  - after (string): Cursor de paginação

Returns JSON com schema:
{
  "total": number,
  "emails": [
    {
      "id": string,
      "hs_name": string,        // nome interno — chave de join com Athena
      "subject": string,
      "state": string,
      "published_at": string | null
    }
  ],
  "has_more": boolean,
  "next_after": string | null
}`,
      inputSchema: z.object({
        state: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED", "ALL"])
          .default("PUBLISHED")
          .describe("Estado dos e-mails a retornar"),
        limit: z.number().int().min(1).max(100).default(DEFAULT_PAGE_LIMIT)
          .describe("Máximo de resultados por página"),
        after: z.string().optional()
          .describe("Cursor de paginação"),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ state, limit, after }) => {
      try {
        const client = getHubSpotClient();
        const params: Record<string, unknown> = { limit };
        if (after) params.after = after;
        if (state !== "ALL") params.state = state;

        const { data } = await client.get<HubSpotEmailsResponse>(
          "/marketing/v3/emails",
          { params }
        );

        const emails = data.results ?? [];

        const output = {
          total: emails.length,
          emails: emails.map((e) => ({
            id: e.id,
            hs_name: e.name,
            subject: e.subject ?? null,
            state: e.currentState ?? null,
            published_at: e.publishDate
              ? new Date(e.publishDate).toISOString()
              : null,
          })),
          has_more: !!data.paging?.next?.after,
          next_after: data.paging?.next?.after ?? null,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: handleHubSpotError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── 2. Histograma diário de métricas por e-mail ─────────────────────────

  server.registerTool(
    "hubspot_get_email_histogram",
    {
      title: "Histograma Diário de Métricas de E-mail",
      description: `Retorna métricas diárias (enviados, entregues, abertos, cliques, bounces etc.)
para um ou mais e-mails HubSpot em um período.

Use este tool para monitoramento operacional de saúde de e-mails e para
alimentar a tabela hs_email_metrics no Supabase.

Args:
  - email_ids (string[]): Lista de IDs de e-mails HubSpot (máx 10 por chamada)
  - start_date (string): Data início YYYY-MM-DD
  - end_date (string): Data fim YYYY-MM-DD

Returns JSON com schema:
{
  "period_start": string,
  "period_end": string,
  "metrics": [
    {
      "date": string,
      "email_id": string,
      "hs_name": string,
      "sent": number,
      "delivered": number,
      "opened": number,
      "clicked": number,
      "bounced_hard": number,
      "bounced_soft": number,
      "unsubscribed": number,
      "spam_reports": number,
      "delivery_rate": number | null,      // % entregues/enviados
      "open_rate": number | null,          // % abertos/entregues
      "click_to_open_rate": number | null, // % cliques/abertos
      "hard_bounce_rate": number | null,   // % hard bounce/enviados
      "spam_rate": number | null           // % spam/enviados
    }
  ]
}`,
      inputSchema: z.object({
        email_ids: z.array(z.string().min(1)).min(1).max(10)
          .describe("IDs dos e-mails HubSpot (máx 10)"),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Data início YYYY-MM-DD"),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Data fim YYYY-MM-DD"),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ email_ids, start_date, end_date }) => {
      try {
        const client = getHubSpotClient();

        const startMs = toTimestampMs(new Date(`${start_date}T00:00:00Z`));
        const endMs   = toTimestampMs(new Date(`${end_date}T23:59:59Z`));

        // Busca nomes dos e-mails para incluir hs_name na resposta
        const nameMap: Record<string, string> = {};
        try {
          const { data: listData } = await client.get<HubSpotEmailsResponse>(
            "/marketing/v3/emails",
            { params: { limit: 100 } }
          );
          for (const e of listData.results ?? []) {
            nameMap[e.id] = e.name;
          }
        } catch {
          // não crítico
        }

        const { data } = await client.get<HubSpotHistogramResponse>(
          "/marketing/v3/emails/statistics/histogram",
          {
            params: {
              interval: "DAY",
              startTimestamp: startMs,
              endTimestamp: endMs,
              emailIds: email_ids.join(","),
            },
          }
        );

        const metrics: EmailMetricsDay[] = (data.results ?? []).map((item) => {
          const counters   = extractCounters(item.aggregations?.counters);
          const qualifiers = extractQualifiers(item.aggregations?.qualifierStats);

          const date = item.startTimestamp
            ? bucketToDate(item.startTimestamp)
            : start_date;

          const emailId = item.emailId ?? email_ids[0];

          return {
            date,
            email_id: emailId,
            hs_name: nameMap[emailId] ?? emailId,
            ...counters,
            ...qualifiers,
            delivery_rate:        safeRate(counters.delivered, counters.sent),
            open_rate:            safeRate(counters.opened, counters.delivered),
            click_to_open_rate:   safeRate(counters.clicked, counters.opened),
            hard_bounce_rate:     safeRate(qualifiers.bounced_hard, counters.sent),
            spam_rate:            safeRate(qualifiers.spam_reports, counters.sent),
          };
        });

        const output = {
          period_start: start_date,
          period_end: end_date,
          metrics,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: handleHubSpotError(err) }],
          isError: true,
        };
      }
    }
  );

  // ── 3. Estatísticas agregadas por e-mail ────────────────────────────────

  server.registerTool(
    "hubspot_get_email_statistics",
    {
      title: "Estatísticas Agregadas de E-mails por Período",
      description: `Retorna estatísticas totais agregadas por e-mail para um período.
Diferente do histograma, não detalha por dia — retorna o total do período inteiro.

Útil para rankings de performance (top e-mails por abertura, conversão etc.)
e para comparar templates em uma visão consolidada.

Args:
  - start_date (string): Data início YYYY-MM-DD
  - end_date (string): Data fim YYYY-MM-DD
  - email_ids (string[]): IDs específicos para filtrar. Se vazio, retorna todos.

Returns JSON com schema:
{
  "period_start": string,
  "period_end": string,
  "total_emails": number,
  "emails": [
    {
      "email_id": string,
      "hs_name": string,
      "sent": number,
      "delivered": number,
      "opened": number,
      "clicked": number,
      "bounced_hard": number,
      "bounced_soft": number,
      "unsubscribed": number,
      "spam_reports": number,
      "delivery_rate": number | null,
      "open_rate": number | null,
      "click_to_open_rate": number | null
    }
  ]
}`,
      inputSchema: z.object({
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Data início YYYY-MM-DD"),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Data fim YYYY-MM-DD"),
        email_ids: z.array(z.string()).default([])
          .describe("IDs para filtrar. Vazio = todos os e-mails"),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ start_date, end_date, email_ids }) => {
      try {
        const client = getHubSpotClient();

        const startMs = toTimestampMs(new Date(`${start_date}T00:00:00Z`));
        const endMs   = toTimestampMs(new Date(`${end_date}T23:59:59Z`));

        const params: Record<string, unknown> = {
          startTimestamp: startMs,
          endTimestamp: endMs,
        };
        if (email_ids.length > 0) {
          params.emailIds = email_ids.join(",");
        }

        // Busca nomes
        const nameMap: Record<string, string> = {};
        try {
          const { data: listData } = await client.get<HubSpotEmailsResponse>(
            "/marketing/v3/emails",
            { params: { limit: 100 } }
          );
          for (const e of listData.results ?? []) {
            nameMap[e.id] = e.name;
          }
        } catch {
          // não crítico
        }

        const { data } = await client.get<HubSpotHistogramResponse>(
          "/marketing/v3/emails/statistics/list",
          { params }
        );

        const emails = (data.results ?? []).map((item) => {
          const counters   = extractCounters(item.aggregations?.counters);
          const qualifiers = extractQualifiers(item.aggregations?.qualifierStats);
          const emailId    = item.emailId ?? "";

          return {
            email_id: emailId,
            hs_name: nameMap[emailId] ?? emailId,
            ...counters,
            ...qualifiers,
            delivery_rate:      safeRate(counters.delivered, counters.sent),
            open_rate:          safeRate(counters.opened, counters.delivered),
            click_to_open_rate: safeRate(counters.clicked, counters.opened),
          };
        });

        const output = {
          period_start: start_date,
          period_end: end_date,
          total_emails: emails.length,
          emails,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: handleHubSpotError(err) }],
          isError: true,
        };
      }
    }
  );
}
