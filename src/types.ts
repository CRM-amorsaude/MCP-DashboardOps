// ── Workflows ──────────────────────────────────────────────────────────────

export interface HubSpotFlow {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  insertedAt?: number;
  updatedAt?: number;
}

export interface HubSpotFlowsResponse {
  results: HubSpotFlow[];
  paging?: {
    next?: { after: string };
  };
}

export interface HubSpotHistogramDataPoint {
  bucket: number;   // unix timestamp ms
  frequency: number;
  series?: string;
}

export interface HubSpotPerformanceResponse {
  results: HubSpotHistogramDataPoint[];
}

// ── Emails ─────────────────────────────────────────────────────────────────

export interface HubSpotEmailStats {
  counters?: Record<string, number>;
  ratios?: Record<string, number>;
  qualifierStats?: Record<string, number>;
  deviceBreakdown?: Record<string, unknown>;
}

export interface HubSpotEmail {
  id: string;
  name: string;
  subject?: string;
  currentState?: string;
  publishDate?: number;
  stats?: HubSpotEmailStats;
}

export interface HubSpotEmailsResponse {
  results: HubSpotEmail[];
  paging?: {
    next?: { after: string };
  };
  total?: number;
}

export interface HubSpotEmailStatisticInterval {
  emailId?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  aggregations?: HubSpotEmailStats;
}

export interface HubSpotHistogramResponse {
  results: HubSpotEmailStatisticInterval[];
  total?: number;
}

// ── Saídas formatadas ───────────────────────────────────────────────────────

export interface WorkflowPerformanceDay {
  date: string;      // YYYY-MM-DD
  enrollments: number;
}

export interface AnomalyResult {
  [key: string]: unknown;
  flow_id: string;
  flow_name: string;
  today: string;
  today_enrollments: number;
  avg_7d: number;
  drop_percent: number;
  has_anomaly: boolean;
  threshold_percent: number;
}

export interface EmailMetricsDay {
  date: string;
  email_id: string;
  hs_name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced_hard: number;
  bounced_soft: number;
  unsubscribed: number;
  spam_reports: number;
  delivery_rate: number | null;
  open_rate: number | null;
  click_to_open_rate: number | null;
  hard_bounce_rate: number | null;
  spam_rate: number | null;
}
