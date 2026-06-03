import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerWorkflowTools } from "./tools/workflows.js";
import { registerEmailTools } from "./tools/emails.js";

// ── Inicialização do servidor ───────────────────────────────────────────────

const server = new McpServer({
  name: "hubspot-crm-mcp",
  version: "1.0.0",
});

registerWorkflowTools(server);
registerEmailTools(server);

// ── Transports ─────────────────────────────────────────────────────────────

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check para Railway
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "hubspot-crm-mcp", version: "1.0.0" });
  });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`hubspot-crm-mcp rodando em http://localhost:${port}/mcp`);
  });
}

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("hubspot-crm-mcp rodando em modo stdio");
}

// ── Entrypoint ─────────────────────────────────────────────────────────────

const transport = process.env.TRANSPORT ?? "http";

if (transport === "http") {
  runHTTP().catch((err) => {
    console.error("Erro ao iniciar servidor HTTP:", err);
    process.exit(1);
  });
} else {
  runStdio().catch((err) => {
    console.error("Erro ao iniciar servidor stdio:", err);
    process.exit(1);
  });
}
