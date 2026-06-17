import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';
import { Section, TableCard, DateFilter, SparkBar, RateBar, Loading, fmtK } from '../components/UI.jsx';
import { useEnrollments } from '../hooks/useEnrollments.js';
import { useEmailMetrics } from '../hooks/useEmailMetrics.js';

const HEALTH_LABEL = { ok: 'Normal', warn: 'Atenção', crit: 'Alerta' };

export default function Operacional() {
  const [days, setDays] = useState(7);
  const { data: flows,  loading: fLoad } = useEnrollments(days);
  const { data: emails, loading: eLoad } = useEmailMetrics(days);

  const anomalias     = flows.filter(f => f.health === 'crit');
  const totalToday    = flows.reduce((s, f) => s + f.today, 0);
  const totalAvg      = flows.reduce((s, f) => s + f.avg7d, 0);
  const totalSent     = emails.reduce((s, e) => s + e.sent, 0);
  const avgOpen       = emails.filter(e => e.open_rate).length
    ? emails.filter(e => e.open_rate).reduce((s, e) => s + e.open_rate, 0) /
      emails.filter(e => e.open_rate).length
    : 0;
  const deltaPct      = totalAvg > 0 ? ((totalToday - totalAvg) / totalAvg) * 100 : 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, margin: 0 }}>
            Monitoramento Operacional
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '3px 0 0', fontFamily: 'var(--font-sans)' }}>
            Saúde dos fluxos e desempenho de e-mails
          </p>
        </div>
        <DateFilter value={days} onChange={setDays} />
      </div>

      {/* Alerta */}
      {anomalias.length > 0 && (
        <div style={{
          background: 'var(--as-vermelho-50)',
          border: '1px solid var(--as-vermelho-100)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 18, fontSize: 12,
          fontFamily: 'var(--font-sans)',
        }}>
          <AlertTriangle size={15} color="var(--as-vermelho)" />
          <span style={{ fontWeight: 700, color: 'var(--as-vermelho-600)' }}>Queda detectada:</span>
          <span style={{ color: 'var(--as-vermelho-500)' }}>
            {anomalias.map(f =>
              f.flow_name.replace('AS | ', '').replace(' [Não Excluir]', '').replace(' [Não excluir]', '')
            ).join(', ')}
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 22 }}>
        <MetricCard
          label="Inscrições hoje"
          value={fmtK(totalToday)}
          delta={deltaPct}
          deltaLabel="vs média 7d"
          accent="var(--as-azul-apatita)"
        />
        <MetricCard
          label="Fluxos monitorados"
          value={flows.length}
          sub={anomalias.length > 0 ? `${anomalias.length} em alerta` : 'Todos normais'}
        />
        <MetricCard
          label="E-mails enviados"
          value={fmtK(totalSent)}
          sub={`${emails.length} campanhas`}
        />
        <MetricCard
          label="Taxa média de abertura"
          value={`${avgOpen.toFixed(1)}%`}
          sub="no período"
          accent="var(--as-vermelho)"
        />
      </div>

      {/* Fluxos */}
      <Section title="Fluxos de automação" badge={`${flows.length} ativos`}>
        {fLoad ? <Loading /> : (
          <TableCard>
            <table style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '34%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Fluxo</th>
                  <th style={{ textAlign: 'right' }}>Hoje</th>
                  <th style={{ textAlign: 'right' }}>D-1</th>
                  <th style={{ textAlign: 'right' }}>Média 7d</th>
                  <th>Variação</th>
                  <th>Tendência</th>
                  <th>Saúde</th>
                </tr>
              </thead>
              <tbody>
                {flows.map(f => (
                  <tr key={f.flow_id}>
                    <td>
                      <div style={{
                        fontWeight: 600, fontSize: 12,
                        fontFamily: 'var(--font-sans)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.flow_name
                          .replace('AS | ', '')
                          .replace(' [Não Excluir]', '')
                          .replace(' [Não excluir]', '')}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>
                      {fmtK(f.today)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      {fmtK(f.prev)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      {fmtK(f.avg7d)}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)',
                        color: f.dropPct <= -10
                          ? 'var(--as-vermelho)'
                          : f.dropPct >= 10
                            ? 'var(--as-success)'
                            : 'var(--color-text-tertiary)',
                      }}>
                        {f.dropPct > 0 ? '+' : ''}{f.dropPct.toFixed(1)}%
                      </span>
                    </td>
                    <td><SparkBar series={f.series} /></td>
                    <td>
                      <span className={`pill pill-${f.health}`}>
                        {HEALTH_LABEL[f.health]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>

      {/* E-mails */}
      <Section title="E-mails de marketing" badge={`${emails.length} campanhas`}>
        {eLoad ? <Loading /> : (
          <TableCard>
            <table style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th style={{ textAlign: 'right' }}>Enviados</th>
                  <th>Taxa entrega</th>
                  <th>Taxa abertura</th>
                  <th>Bounce hard</th>
                  <th>Spam</th>
                </tr>
              </thead>
              <tbody>
                {emails.map(e => (
                  <tr key={e.email_id}>
                    <td>
                      <div style={{
                        fontWeight: 600, fontSize: 12,
                        fontFamily: 'var(--font-sans)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {e.hs_name}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>
                      {fmtK(e.sent)}
                    </td>
                    <td>
                      <RateBar
                        value={e.delivery_rate || 0}
                        max={100}
                        color={(e.delivery_rate || 0) >= 97 ? 'var(--as-success)' : 'var(--as-warning)'}
                      />
                    </td>
                    <td>
                      <RateBar value={e.open_rate || 0} max={80} color="var(--as-azul-apatita)" />
                    </td>
                    <td>
                      <span className={`pill ${
                        (e.hard_bounce_rate || 0) < 0.5 ? 'pill-ok'
                        : (e.hard_bounce_rate || 0) < 1.5 ? 'pill-warn'
                        : 'pill-crit'
                      }`}>
                        {(e.hard_bounce_rate || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${
                        (e.spam_rate || 0) < 0.05 ? 'pill-ok'
                        : (e.spam_rate || 0) < 0.1 ? 'pill-warn'
                        : 'pill-crit'
                      }`}>
                        {(e.spam_rate || 0).toFixed(3)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>
    </div>
  );
}
