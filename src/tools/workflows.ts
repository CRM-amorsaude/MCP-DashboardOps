import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getHubSpotClient,
  handleHubSpotError,
  toTimestampMs,
  bucketToDate,
} from "../services/hubspot.js";
import {
  HubSpotFlowsResponse,
  HubSpotPerformanceResponse,
  WorkflowPerformanceDay,
  AnomalyResult,
} from "../types.js";
import { DEFAULT_PAGE_LIMIT, ANOMALY_THRESHOLD_PERCENT } from "../constants.js";

export function registerWorkflowTools(server: McpServer): void {

  // ── 1. Listar fluxos ────────────────────────────────────────────────────

  server.registerTool(
    "hubspot_list_workflows",
    {
      title: "Listar Fluxos HubSpot",
      description: `Lista todos os fluxos de automação (workflows) do portal HubSpot.

Retorna id, nome, tipo, status de ativação e datas de cada fluxo.
Use este tool para descobrir os flow_ids necessários antes de consultar performance.

Args:
  - enabled_only (boolean): Se true, retorna apenas fluxos ativos. Default: false
  - limit (number): Máximo de fluxos por página, 1-100. Default: 100

Returns JSON com schema:
{
  "total": number,
  "flows": [
    {
      "id": string,
      "name": string,
      "type": string,
      "enabled": boolean,
      "created_at": string,   // ISO date
      "updated_at": string    // ISO date
    }
  ],
  "has_more": boolean,
  "next_after": string | null
}`,
      inputSchema: z.object({
        enabled_only: z.boolean().default(false)
          .describe("Se true, retorna apenas fluxos ativos"),
        limit: z.number().int().min(1).max(100).default(DEFAULT_PAGE_LIMIT)
          .describe("Máximo de resultados por página"),
        after: z.string().optional()
          .describe("Cursor de paginação retornado em next_after"),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ enabled_only, limit, after }) => {
      try {
        const client = getHubSpotClient();
        const params: Record<string, unknown> = { limit };
        if (after) params.after = after;

        const { data } = await client.get<HubSpotFlowsResponse>(
          "/automation/v4/flows",
          { params }
        );

        let flows = data.results ?? [];
        if (enabled_only) {
          flows = flows.filter((f) => f.enabled);
        }

        const output = {
          total: flows.length,
          flows: flows.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type ?? "WORKFLOW",
            enabled: f.enabled,
            created_at: f.insertedAt
              ? new Date(f.insertedAt).toISOString()
              : null,
            updated_at: f.updatedAt
              ? new Date(f.updatedAt).toISOString()
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

  // ── 2. Performance de um fluxo por período ──────────────────────────────

  server.registerTool(
    "hubspot_get_workflow_performance",
    {
      title: "Performance de Fluxo por Período",
      description: `Retorna a contagem diária de inscrições em um fluxo HubSpot para um período.

Use este tool para monitorar o volume de enrollments ao longo do tempo.
Para detectar anomalias automaticamente, use hubspot_detect_enrollment_anomaly.

Args:
  - flow_id (string): ID do fluxo HubSpot (obter via hubspot_list_workflows)
  - start_date (string): Data início no formato YYYY-MM-DD
  - end_date (string): Data fim no formato YYYY-MM-DD

Returns JSON com schema:
{
  "flow_id": string,
  "period_start": string,
  "period_end": string,
  "total_enrollments": number,
  "days": [
    {
      "date": string,          // YYYY-MM-DD
      "enrollments": number
    }
  ]
}`,
      inputSchema: z.object({
        flow_id: z.string().min(1)
          .describe("ID do fluxo HubSpot"),
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
    async ({ flow_id, start_date, end_date }) => {
      try {
        const client = getHubSpotClient();

        const startMs = toTimestampMs(new Date(`${start_date}T00:00:00Z`));
        const endMs = toTimestampMs(new Date(`${end_date}T23:59:59Z`));

        const { data } = await client.get<HubSpotPerformanceResponse>(
          `/automation/v4/flows/performance/${flow_id}`,
          { params: { bucketType: "DAY", start: startMs, end: endMs } }
        );

        const days: WorkflowPerformanceDay[] = (data.results ?? []).map((p) => ({
          date: bucketToDate(p.bucket),
          enrollments: p.frequency ?? 0,
        }));

        const total = days.reduce((sum, d) => sum + d.enrollments, 0);

        const output = {
          flow_id,
          period_start: start_date,
          period_end: end_date,
          total_enrollments: total,
          days,
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

  // ── 3. Detecção de anomalia de enrollment ───────────────────────────────

  server.registerTool(
    "hubspot_detect_enrollment_anomaly",
    {
      title: "Detectar Anomalia de Inscrição em Fluxo",
      description: `Compara o volume de inscrições do dia atual com a média dos últimos 7 dias.
Dispara alerta se a queda for maior que o threshold configurado (padrão: 20%).

Use este tool no job diário de monitoramento operacional.

Args:
  - flow_id (string): ID do fluxo HubSpot
  - reference_date (string): Data de referência no formato YYYY-MM-DD (geralmente hoje)
  - threshold_percent (number): Percentual de queda para considerar anomalia. Default: 20

Returns JSON com schema:
{
  "flow_id": string,
  "flow_name": string,
  "today": string,
  "today_enrollments": number,
  "avg_7d": number,
  "drop_percent": number,       // negativo = queda, positivo = crescimento
  "has_anomaly": boolean,
  "threshold_percent": number
}`,
      inputSchema: z.object({
        flow_id: z.string().min(1)
          .describe("ID do fluxo HubSpot"),
        reference_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Data de referência YYYY-MM-DD"),
        threshold_percent: z.number().min(1).max(100)
          .default(ANOMALY_THRESHOLD_PERCENT)
          .describe("Percentual de queda para anomalia (padrão: 20)"),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ flow_id, reference_date, threshold_percent }) => {
      try {
        const client = getHubSpotClient();

        const refDate = new Date(`${reference_date}T00:00:00Z`);
        const sevenDaysAgo = new Date(refDate);
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

        const startMs = toTimestampMs(sevenDaysAgo);
        const endMs = toTimestampMs(new Date(`${reference_date}T23:59:59Z`));

        const { data } = await client.get<HubSpotPerformanceResponse>(
          `/automation/v4/flows/performance/${flow_id}`,
          { params: { bucketType: "DAY", start: startMs, end: endMs } }
        );

        const points = data.results ?? [];

        // Separa hoje dos 7 dias anteriores
        const todayStr = reference_date;
        const todayPoint = points.find((p) => bucketToDate(p.bucket) === todayStr);
        const priorPoints = points.filter((p) => bucketToDate(p.bucket) !== todayStr);

        const todayEnrollments = todayPoint?.frequency ?? 0;
        const avg7d =
          priorPoints.length > 0
            ? priorPoints.reduce((s, p) => s + (p.frequency ?? 0), 0) / priorPoints.length
            : 0;

        const dropPercent =
          avg7d > 0
            ? Math.round(((todayEnrollments - avg7d) / avg7d) * 10000) / 100
            : 0;

        const hasAnomaly = dropPercent <= -threshold_percent;

        // Busca nome do fluxo
        let flowName = flow_id;
        try {
          const { data: flowData } = await client.get<{ name: string }>(
            `/automation/v4/flows/${flow_id}`
          );
          flowName = flowData.name ?? flow_id;
        } catch {
          // nome não crítico, segue com ID
        }

        const output: AnomalyResult = {
          flow_id,
          flow_name: flowName,
          today: todayStr,
          today_enrollments: todayEnrollments,
          avg_7d: Math.round(avg7d * 100) / 100,
          drop_percent: dropPercent,
          has_anomaly: hasAnomaly,
          threshold_percent,
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
