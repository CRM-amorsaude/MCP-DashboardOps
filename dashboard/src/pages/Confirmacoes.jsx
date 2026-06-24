import { useState, useEffect, useMemo } from 'react';
import { subDays, format, startOfDay } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
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
import { Section, DateFilter, TableCard, fmtK } from '../components/UI';

const COR_MED  = '#61C1D0';
const COR_ODO  = '#D73834';
const COR_GRID = 'rgba(0,0,0,0.06)';

const CANAIS = [
  { key: 'WhatsApp', label: 'WhatsApp' },
  { key: 'Email',    label: 'E-mail'   },
  { key: 'Push',     label: 'Push'     },
];

const fmtPct  = v => `${v.toFixed(1)}%`;
const fmtDate = d => `${d.split('-')[2]}/${d.split('-')[1]}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0C223C', borderRadius: 8, padding: '8px 12px',
      fontSize: 12, color: '#fff',
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

export default function Confirmacoes() {
  const [dias, setDias]         = useState(7);
  const [prevRows, setPrevRows] = useState([]);

  // useMemo evita recriação de Date a cada render (causaria loop infinito no hook)
  const endDate   = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(() => subDays(endDate, dias - 1), [dias, endDate]);

  const { data: rows, loading } = useConfirmacoes({ startDate, endDate });

  useEffect(() => {
    fetchPeriodoAnterior(startDate, endDate)
      .then(setPrevRows)
      .catch(() => setPrevRows([]));
  }, [startDate, endDate]);

  const kpis        = useMemo(() => calcKpisByBu(rows),      [rows]);
  const byCanal     = useMemo(() => calcByCanal(rows),       [rows]);
  const daily       = useMemo(() => calcDailySeries(rows),   [rows]);
  const kpisPrev    = useMemo(() => calcKpisByBu(prevRows),  [prevRows]);
  const byCanalPrev = useMemo(() => calcByCanal(prevRows),   [prevRows]);

  const varMed = {
    confirmacoes: calcVariacao(kpis.Medicina.confirmacoes, kpisPrev.Medicina.confirmacoes),
    atendidos:    calcVariacao(kpis.Medicina.atendidos,    kpisPrev.Medicina.atendidos),
    taxa:         kpis.Medicina.taxa - (kpisPrev.Medicina.taxa ?? 0),
  };
  const varOdo = {
    confirmacoes: calcVariacao(kpis.Odonto.confirmacoes, kpisPrev.Odonto.confirmacoes),
    atendidos:    calcVariacao(kpis.Odonto.atendidos,    kpisPrev.Odonto.atendidos),
    taxa:         kpis.Odonto.taxa - (kpisPrev.Odonto.taxa ?? 0),
  };

  const canalChartData = CANAIS.map(({ key, label }) => ({
    canal: label,
    Medicina: byCanal[key]?.Medicina?.confirmacoes ?? 0,
    Odonto:   byCanal[key]?.Odonto?.confirmacoes   ?? 0,
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Carregando confirmações...</p>
      </div>
    );
  }

  return (
    <div>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900,
            color: 'var(--color-text-primary)', margin: '0 0 2px',
          }}>
            Confirmações
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
            {format(startDate, 'dd/MM')} – {format(endDate, 'dd/MM/yyyy')} · confirmações de consulta e conversão por canal
          </p>
        </div>
        <DateFilter value={dias} onChange={setDias} />
      </div>

      {/* ── KPIs Medicina ───────────────────────────────────── */}
      <Section title="Medicina">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <MetricCard
            label="Confirmações"
            value={fmtK(kpis.Medicina.confirmacoes)}
            delta={varMed.confirmacoes}
            deltaLabel="vs período ant."
            accent={COR_MED}
          />
          <MetricCard
            label="Atendidos"
            value={fmtK(kpis.Medicina.atendidos)}
            delta={varMed.atendidos}
            deltaLabel="vs período ant."
            accent={COR_MED}
          />
          <MetricCard
            label="Taxa de conversão"
            value={fmtPct(kpis.Medicina.taxa)}
            delta={varMed.taxa}
            deltaLabel="pp vs período ant."
            accent={COR_MED}
          />
        </div>
      </Section>

      {/* ── KPIs Odontologia ────────────────────────────────── */}
      <Section title="Odontologia">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <MetricCard
            label="Confirmações"
            value={fmtK(kpis.Odonto.confirmacoes)}
            delta={varOdo.confirmacoes}
            deltaLabel="vs período ant."
            accent={COR_ODO}
          />
          <MetricCard
            label="Atendidos"
            value={fmtK(kpis.Odonto.atendidos)}
            delta={varOdo.atendidos}
            deltaLabel="vs período ant."
            accent={COR_ODO}
          />
          <MetricCard
            label="Taxa de conversão"
            value={fmtPct(kpis.Odonto.taxa)}
            delta={varOdo.taxa}
            deltaLabel="pp vs período ant."
            accent={COR_ODO}
          />
        </div>
      </Section>

      {/* ── Gráficos ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 24 }}>

        <div style={{
          background: 'var(--as-branco)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)', padding: '16px 20px',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Confirmações por dia
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['Medicina', COR_MED], ['Odonto', COR_ODO]].map(([lbl, cor]) => (
                <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  <span style={{ width: 14, height: 2, background: cor, display: 'inline-block' }} />
                  {lbl}
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

        <div style={{
          background: 'var(--as-branco)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)', padding: '16px 20px',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Por canal
            </span>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['Med', COR_MED], ['Odo', COR_ODO]].map(([lbl, cor]) => (
                <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  <span style={{ width: 8, height: 8, background: cor, borderRadius: 2, display: 'inline-block' }} />
                  {lbl}
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
              <Bar dataKey="Medicina" fill={COR_MED} radius={[3, 3, 0, 0]} barSize={18} />
              <Bar dataKey="Odonto"   fill={COR_ODO} radius={[3, 3, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabela detalhada ─────────────────────────────────── */}
      <Section title="Detalhamento por canal">
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--as-gelo)' }}>
                {['Canal', 'Segmento', 'Confirmados · var.', 'Atendidos · var.', 'Tx. conversão'].map((h, i) => (
                  <th key={h} style={{
                    padding: '9px 16px',
                    textAlign: i < 2 ? 'left' : 'right',
                    fontWeight: 700, fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-tertiary)',
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CANAIS.flatMap(({ key: canal, label }, ci) =>
                ['Medicina', 'Odonto'].map((bu, bi) => {
                  const curr   = byCanal[canal]?.[bu]     ?? { confirmacoes: 0, atendidos: 0, taxa: 0 };
                  const prev   = byCanalPrev[canal]?.[bu] ?? { confirmacoes: 0, atendidos: 0, taxa: 0 };
                  const varConf = calcVariacao(curr.confirmacoes, prev.confirmacoes);
                  const varAtd  = calcVariacao(curr.atendidos,    prev.atendidos);

                  return (
                    <tr
                      key={`${canal}-${bu}`}
                      style={{ borderTop: `1px solid ${ci > 0 && bi === 0 ? 'var(--color-border)' : '#f3f4f6'}` }}
                    >
                      {bi === 0 && (
                        <td rowSpan={2} style={{ padding: '10px 16px', verticalAlign: 'middle', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {label}
                        </td>
                      )}
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: bu === 'Medicina' ? '#e0f7fa' : '#ffebee',
                          color:      bu === 'Medicina' ? '#006064' : '#b71c1c',
                        }}>
                          {bu}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmtK(curr.confirmacoes)}</div>
                        {varConf !== null && (
                          <div style={{ fontSize: 10, color: varConf >= 0 ? 'var(--as-success)' : 'var(--as-vermelho)' }}>
                            {varConf >= 0 ? '↑' : '↓'} {Math.abs(varConf).toFixed(1)}% vs ant.
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{fmtK(curr.atendidos)}</div>
                        {varAtd !== null && (
                          <div style={{ fontSize: 10, color: varAtd >= 0 ? 'var(--as-success)' : 'var(--as-vermelho)' }}>
                            {varAtd >= 0 ? '↑' : '↓'} {Math.abs(varAtd).toFixed(1)}% vs ant.
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: bu === 'Medicina' ? COR_MED : COR_ODO }}>
                        {fmtPct(curr.taxa)}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Total geral */}
              {(() => {
                const totConf  = Object.values(kpis).reduce((s, v) => s + v.confirmacoes, 0);
                const totAtd   = Object.values(kpis).reduce((s, v) => s + v.atendidos,    0);
                const totConfP = Object.values(kpisPrev).reduce((s, v) => s + v.confirmacoes, 0);
                const totAtdP  = Object.values(kpisPrev).reduce((s, v) => s + v.atendidos,    0);
                const taxa  = totConf > 0 ? (totAtd / totConf) * 100 : 0;
                const vConf = calcVariacao(totConf, totConfP);
                const vAtd  = calcVariacao(totAtd,  totAtdP);
                return (
                  <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--as-gelo)' }}>
                    <td colSpan={2} style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Total geral
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmtK(totConf)}</div>
                      {vConf !== null && (
                        <div style={{ fontSize: 10, color: vConf >= 0 ? 'var(--as-success)' : 'var(--as-vermelho)' }}>
                          {vConf >= 0 ? '↑' : '↓'} {Math.abs(vConf).toFixed(1)}% vs ant.
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmtK(totAtd)}</div>
                      {vAtd !== null && (
                        <div style={{ fontSize: 10, color: vAtd >= 0 ? 'var(--as-success)' : 'var(--as-vermelho)' }}>
                          {vAtd >= 0 ? '↑' : '↓'} {Math.abs(vAtd).toFixed(1)}% vs ant.
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {fmtPct(taxa)}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </TableCard>
      </Section>
    </div>
  );
}
