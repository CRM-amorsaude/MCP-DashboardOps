import axios, { AxiosInstance, AxiosError } from "axios";
import { HUBSPOT_BASE_URL } from "../constants.js";

let client: AxiosInstance | null = null;

export function getHubSpotClient(): AxiosInstance {
  if (client) return client;

  const token = process.env.HUBSPOT_API_TOKEN;
  if (!token) {
    throw new Error(
      "HUBSPOT_API_TOKEN não configurado. Defina a variável de ambiente antes de iniciar o servidor."
    );
  }

  client = axios.create({
    baseURL: HUBSPOT_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });

  return client;
}

export function handleHubSpotError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ message?: string; category?: string }>;
    const status = axiosErr.response?.status;
    const msg = axiosErr.response?.data?.message ?? axiosErr.message;

    if (status === 401) {
      return "Erro 401: Token HubSpot inválido ou expirado. Verifique HUBSPOT_API_TOKEN.";
    }
    if (status === 403) {
      return `Erro 403: Sem permissão para este endpoint. Verifique os scopes do Private App (automation, marketing-email). Detalhe: ${msg}`;
    }
    if (status === 404) {
      return `Erro 404: Recurso não encontrado. ${msg}`;
    }
    if (status === 429) {
      return "Erro 429: Rate limit atingido. Aguarde antes de tentar novamente.";
    }
    return `Erro HubSpot ${status ?? "desconhecido"}: ${msg}`;
  }

  if (error instanceof Error) {
    return `Erro inesperado: ${error.message}`;
  }

  return "Erro desconhecido ao chamar a HubSpot API.";
}

// Converte Date para unix timestamp em milissegundos
export function toTimestampMs(date: Date): number {
  return date.getTime();
}

// Formata unix timestamp ms para YYYY-MM-DD
export function bucketToDate(bucketMs: number): string {
  return new Date(bucketMs).toISOString().split("T")[0];
}

// Calcula taxa percentual com segurança
export function safeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100; // 2 casas decimais
}
