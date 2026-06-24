import { useState, useEffect, useMemo } from 'react';
import { subDays, format, startOfDay } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  useConfirmacoes,
  calcKpisByBu,
  calcByCanal,
  calcDailySeries,
  calcVariacao,
  fetchPeriodoAnterior,
} from '../hooks/useConfirmacoes';
import MetricCard from '../components/MetricCard';
import { Section, fmtK } from '../components/UI';

// ─── Constantes ──────────────────────────────────────────────
const COR_MED  = '#61C1D0';
const COR_ODO  = '#D73834';
const COR_GRID = 'rgba(0,0,0,0.06)';

const CANAIS = [
  { key: 'WhatsApp', label: 'WhatsApp', icon: '💬' },
  { key: 'Email',    label: 'E-mail',   icon: '✉️' },
  { key: 'Push',     label: 'Push',     icon: '📲' },
];

const PERIODOS = [
  { label: '7d',  days: 7  },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
];

// ─── Formatadores ────────────────────────────────────────────
const fmtPct  = v => `${v.toFixed(1)}%`;
const fmtDate = d => {
  const [, , dd] = d.split('-');
  return `${dd}/${d.split('-')[1]}`;
};
const fmtVar = (v, suffix = '%') => {
  if (v === null || v === undefined) return null;
  const sinal = v >= 0 ? '↑' : '↓';
  return `${sinal} ${Math.abs(v).toFixed(1)}${suffix}`;
};
const varColor = v => (v === null ? '#9ca3af' : v >= 0 ? '#16a34a' : '#dc2626');

// ─── Componente de variação ──────────────────────────────────
function Delta({ value, suffix = '%' }) {
  if (value === null) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
  return (
    <span style={{ color: varColor(value), fontSize: 11 }}>
      {fmtVar(value, suffix)}
    </span>
  );
}

// ─── Tooltip customizado ─────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0C223C', borderRadius: 8, padding: '8px 12px',
      fontSize: 12, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <p style={{ margin: '0 0 4px', color: '#9ca3af' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: 0, color: p.color }}>
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function Confirmacoes() {
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const [prevRows, setPrevRows]     = useState([]);

  const dias = PERIODOS[periodoIdx].days;
  const endDate   = startOfDay(new Date());
  const startDate = subDays(endDate, dias - 1);

  const { data: rows, loading } = useConfirmacoes({ startDate, endDate });

  // Busca período anterior para variação
  useEffect(() => {
    fetchPeriodoAnterior(startDate, endDate)
      .then(setPrevRows)
      .catch(() => setPrevRows([]));
  }, [startDate.toISOString(), endDate.toISOString()]);

  // Cálculos do período atual
  const kpis    = useMemo(() => calcKpisByBu(rows),    [rows]);
  const byCanal = useMemo(() => calcByCanal(rows),     [rows]);
  const daily   = useMemo(() => calcDailySeries(rows), [rows]);

  // Cálculos do período anterior
  const kpisPrev    = useMemo(() => calcKpisByBu(prevRows),    [prevRows]);
  const byCanalPrev = useMemo(() => calcByCanal(prevRows),     [prevRows]);

  const varMed = {
    confirmacoes: calcVariacao(kpis.Medicina.confirmacoes, kpisPrev.Medicina.confirmacoes),
    atendidos:    calcVariacao(kpis.Medicina.atendidos,    kpisPrev.Medicina.atendidos),
    taxa:         kpis.Medicina.taxa - (kpisPrev.Medicina.taxa || 0),
  };
  const varOdo = {
    confirmacoes: calcVariacao(kpis.Odonto.confirmacoes, kpisPrev.Odonto.confirmacoes),
    atendidos:    calcVariacao(kpis.Odonto.atendidos,    kpisPrev.Odonto.atendidos),
    taxa:         kpis.Odonto.taxa - (kpisPrev.Odonto.taxa || 0),
  };

  // Dados para gráfico de barras por canal
  const canalChartData = CANAIS.map(({ key, label }) => ({
    canal: label,
    Medicina: (byCanal[key]?.Medicina?.confirmacoes || 0),
    Odonto:   (byCanal[key]?.Odonto?.confirmacoes   || 0),
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando confirmações...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1280 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0C223C', margin: '0 0 4px' }}>
            Confirmações
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Confirmações de consulta e taxa de conversão por canal
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {PERIODOS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodoIdx(i)}
              style={{
                padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                fontWeight: periodoIdx === i ? 600 : 400,
                background: periodoIdx === i ? '#61C1D0' : '#fff',
                border: periodoIdx === i ? 'none' : '1px solid #e5e7eb',
                color: periodoIdx === i ? '#0C223C' : '#6b7280',
              }}
            >
              {p.label}
            </button>
          ))}
          <span style={{
            fontSize: 12, color: '#9ca3af', marginLeft: 6,
            padding: '6px 10px', background: '#f9fafb',
            border: '1px solid #e5e7eb', borderRadius: 6,
          }}>
            {format(startDate, 'dd/MM')} – {format(endDate, 'dd/MM')}
          </span>
        </div>
      </div>

      {/* ── KPIs Medicina ──────────────────────────────────── */}
      <Section
        label="Medicina"
        labelColor={COR_MED}
        style={{ marginBottom: 0 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <MetricCard
          title="Confirmações"
          value={fmtK(kpis.Medicina.confirmacoes)}
          delta={<Delta value={varMed.confirmacoes} />}
          deltaLabel="vs período ant."
          accentColor={COR_MED}
        />
        <MetricCard
          title="Atendidos"
          value={fmtK(kpis.Medicina.atendidos)}
          delta={<Delta value={varMed.atendidos} />}
          deltaLabel="vs período ant."
          accentColor={COR_MED}
        />
        <MetricCard
          title="Taxa de conversão"
          value={fmtPct(kpis.Medicina.taxa)}
          delta={<Delta value={varMed.taxa} suffix="pp" />}
          deltaLabel="vs período ant."
          accentColor={COR_MED}
          progress={kpis.Medicina.taxa / 100}
          progressColor={COR_MED}
        />
      </div>

      {/* ── KPIs Odontologia ───────────────────────────────── */}
      <Section
        label="Odontologia"
        labelColor={COR_ODO}
        style={{ marginBottom: 0 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard
          title="Confirmações"
          value={fmtK(kpis.Odonto.confirmacoes)}
          delta={<Delta value={varOdo.confirmacoes} />}
          deltaLabel="vs período ant."
          accentColor={COR_ODO}
        />
        <MetricCard
          title="Atendidos"
          value={fmtK(kpis.Odonto.atendidos)}
          delta={<Delta value={varOdo.atendidos} />}
          deltaLabel="vs período ant."
          accentColor={COR_ODO}
        />
        <MetricCard
          title="Taxa de conversão"
          value={fmtPct(kpis.Odonto.taxa)}
          delta={<Delta value={varOdo.taxa} suffix="pp" />}
          deltaLabel="vs período ant."
          accentColor={COR_ODO}
          progress={kpis.Odonto.taxa / 100}
          progressColor={COR_ODO}
        />
      </div>

      {/* ── Gráficos ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 24 }}>

        {/* Confirmações por dia */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0C223C', margin: 0 }}>
              Confirmações por dia
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['Medicina', COR_MED], ['Odonto', COR_ODO]].map(([label, cor]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
                  <span style={{ width: 14, height: 2, background: cor, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COR_GRID} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Medicina" stroke={COR_MED} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Odonto" stroke={COR_ODO} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Por canal */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0C223C', margin: 0 }}>Por canal</p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['Med', COR_MED], ['Odo', COR_ODO]].map(([label, cor]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
                  <span style={{ width: 8, height: 8, background: cor, borderRadius: 2, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={canalChartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COR_GRID} vertical={false} />
              <XAxis dataKey="canal" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Medicina" name="Medicina" fill={COR_MED} radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="Odonto"   name="Odonto"   fill={COR_ODO} radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabela detalhada ───────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0C223C', margin: 0 }}>Detalhamento por canal</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            {format(startDate, 'dd/MM')} – {format(endDate, 'dd/MM')} · variação vs período anterior
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Canal', 'Segmento', 'Confirmados · var.', 'Atendidos · var.', 'Tx. conversão'].map(h => (
                <th key={h} style={{
                  padding: '9px 16px', textAlign: h === 'Canal' || h === 'Segmento' ? 'left' : 'right',
                  fontWeight: 500, color: '#6b7280', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CANAIS.map(({ key: canal, label, icon }, ci) => (
              ['Medicina', 'Odonto'].map((bu, bi) => {
                const curr = byCanal[canal]?.[bu] || { confirmacoes: 0, atendidos: 0, taxa: 0 };
                const prev = byCanalPrev[canal]?.[bu] || { confirmacoes: 0, atendidos: 0, taxa: 0 };
                const isFirstRow = bi === 0;
                const isCanalBorder = ci > 0 && bi === 0;

                return (
                  <tr
                    key={`${canal}-${bu}`}
                    style={{ borderTop: `1px solid ${isCanalBorder ? '#d1d5db' : '#f3f4f6'}` }}
                  >
                    {isFirstRow && (
                      <td rowSpan={2} style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{icon}</span>
                          <span style={{ fontWeight: 600, color: '#111827' }}>{label}</span>
                        </div>
                      </td>
                    )}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: bu === 'Medicina' ? '#e0f7fa' : '#ffebee',
                        color: bu === 'Medicina' ? '#006064' : '#b71c1c',
                      }}>
                        {bu}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>
                        {fmtK(curr.confirmacoes)}
                      </p>
                      <Delta value={calcVariacao(curr.confirmacoes, prev.confirmacoes)} />
                      <span style={{ fontSize: 10, color: '#9ca3af' }}> vs ant.</span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <p style={{ color: '#374151', margin: '0 0 2px' }}>
                        {fmtK(curr.atendidos)}
                      </p>
                      <Delta value={calcVariacao(curr.atendidos, prev.atendidos)} />
                      <span style={{ fontSize: 10, color: '#9ca3af' }}> vs ant.</span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 600,
                        color: bu === 'Medicina' ? '#0369a1' : '#b91c1c',
                      }}>
                        {fmtPct(curr.taxa)}
                      </span>
                    </td>
                  </tr>
                );
              })
            ))}

            {/* Total geral */}
            {(() => {
              const totConfAtual = Object.values(kpis).reduce((s, v) => s + v.confirmacoes, 0);
              const totAtdAtual  = Object.values(kpis).reduce((s, v) => s + v.atendidos, 0);
              const totConfPrev  = Object.values(kpisPrev).reduce((s, v) => s + v.confirmacoes, 0);
              const totAtdPrev   = Object.values(kpisPrev).reduce((s, v) => s + v.atendidos, 0);
              const taxaTotal    = totConfAtual > 0 ? (totAtdAtual / totConfAtual) * 100 : 0;

              return (
                <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: 600 }}>
                  <td colSpan={2} style={{ padding: '10px 16px', color: '#0C223C', fontSize: 13 }}>
                    Total geral
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: '#0C223C', margin: '0 0 2px' }}>
                      {fmtK(totConfAtual)}
                    </p>
                    <Delta value={calcVariacao(totConfAtual, totConfPrev)} />
                    <span style={{ fontSize: 10, color: '#9ca3af' }}> vs ant.</span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: '#0C223C', margin: '0 0 2px' }}>
                      {fmtK(totAtdAtual)}
                    </p>
                    <Delta value={calcVariacao(totAtdAtual, totAtdPrev)} />
                    <span style={{ fontSize: 10, color: '#9ca3af' }}> vs ant.</span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#0C223C' }}>
                    {fmtPct(taxaTotal)}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
