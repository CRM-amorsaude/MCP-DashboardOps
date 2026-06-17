import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';
import { Section, TableCard, ERPFilter, Loading, fmtK, fmtBRL } from '../components/UI.jsx';
import { useAttribution, aggregateCampaigns } from '../hooks/useAttribution.js';

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: 'var(--as-branco)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      boxShadow: 'var(--shadow-md)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12, maxWidth: 220,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        {d?.nm_campanha}
      </div>
      <div style={{ color: 'var(--color-text-secondary)' }}>{fmtBRL(d?.receita_atribuida)}</div>
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>
        {fmtK(d?.conversoes)} conversões
      </div>
    </div>
  );
};

export default function Estrategico() {
  const [erp, setErp]         = useState('todos');
  const [selIdx, setSelIdx]   = useState(null);
  const { data: raw, loading } = useAttribution(erp);
  const campanhas              = useMemo(() => aggregateCampaigns(raw), [raw]);

  const totalReceita    = campanhas.reduce((s, c) => s + c.receita_atribuida, 0);
  const totalConversoes = campanhas.reduce((s, c) => s + c.conversoes, 0);
  const ticketMedio     = totalConversoes > 0 ? totalReceita / totalConversoes : 0;
  const recMed          = raw.filter(r => r.erp === 'Amei').reduce((s, r) => s + Number(r.receita_atribuida), 0);
  const recOdo          = raw.filter(r => r.erp !== 'Amei').reduce((s, r) => s + Number(r.receita_atribuida), 0);

  const top10 = campanhas.slice(0, 10);

  // Tipos da campanha selecionada ou agregado geral
  const tiposData = useMemo(() => {
    const src = selIdx !== null ? [campanhas[selIdx]] : campanhas;
    const map = {};
    for (const c of src) {
      for (const t of (c.tipos || [])) {
        const key = t.origem;
        if (!map[key]) map[key] = { origem: key, conversoes: 0, receita: 0 };
        map[key].conversoes += t.conversoes;
        map[key].receita    += t.receita;
      }
    }
    return Object.values(map).sort((a, b) => b.receita - a.receita);
  }, [campanhas, selIdx]);

  function toggleCamp(i) {
    setSelIdx(prev => prev === i ? null : i);
  }

  const selName = selIdx !== null ? campanhas[selIdx]?.nm_campanha : null;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, margin: 0 }}>
            Dashboard Estratégico
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '3px 0 0', fontFamily: 'var(--font-sans)' }}>
            Atribuição de receita por campanha · Clique em uma campanha para detalhar
          </p>
        </div>
        <ERPFilter value={erp} onChange={v => { setErp(v); setSelIdx(null); }} />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr)) 1fr', gap: 12, marginBottom: 22 }}>
        <MetricCard label="Receita atribuída total" value={fmtBRL(totalReceita)} sub="histórico" accent="var(--as-azul-apatita)" />
        <MetricCard label="Conversões totais"       value={fmtK(totalConversoes)} sub={`${campanhas.length} campanhas`} />
        <MetricCard label="Ticket médio"             value={fmtBRL(ticketMedio)} sub="por conversão" accent="var(--as-vermelho)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Medicina', val: recMed },
            { label: 'Odonto',   val: recOdo },
          ].map(({ label, val }) => (
            <div key={label} style={{
              flex: 1, background: 'var(--as-branco)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: 'var(--color-text-tertiary)',
                marginBottom: 4, fontFamily: 'var(--font-sans)',
              }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900 }}>
                {fmtBRL(val)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <Section title="Top 10 campanhas por receita">
        {loading ? <Loading /> : (
          <div style={{
            background: 'var(--as-branco)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 14px 8px',
            boxShadow: 'var(--shadow-xs)',
            marginBottom: 22,
          }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis
                  type="number"
                  tickFormatter={v => fmtBRL(v)}
                  tick={{ fontSize: 10, fill: 'var(--as-cinza-400)', fontFamily: 'Nunito' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category" dataKey="nm_campanha" width={230}
                  tickFormatter={v => v.replace('AS | ', '').replace('ODONTO | ', '').substring(0, 32)}
                  tick={{ fontSize: 11, fill: 'var(--as-cinza-600)', fontFamily: 'Nunito' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="receita_atribuida" radius={[0, 5, 5, 0]} maxBarSize={20}>
                  {top10.map((c, i) => (
                    <Cell key={i} fill={c.erp === 'Amei' ? '#61C1D0' : '#0C223C'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, paddingLeft: 8, marginTop: 6 }}>
              {[
                { color: '#61C1D0', label: 'Medicina (Amei)' },
                { color: '#0C223C', label: 'Odonto' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'Nunito' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Banner seleção */}
      {selName && (
        <div style={{
          background: 'var(--as-azul-apatita-50)',
          border: '1px solid var(--as-azul-apatita-200)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, fontSize: 12, fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--as-azul-escuro)' }}>
            Detalhando: {selName}
          </span>
          <button
            onClick={() => setSelIdx(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--as-azul-apatita-700)',
              fontFamily: 'var(--font-sans)', fontWeight: 600, padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ✕ Limpar
          </button>
        </div>
      )}

      {/* Tabela campanhas */}
      <Section
        title="Campanhas"
        badge={`${campanhas.length}`}
        action={<span style={{ fontSize: 11, color: 'var(--as-azul-apatita-600)', fontFamily: 'var(--font-sans)' }}>← clique para filtrar</span>}
      >
        {loading ? <Loading /> : (
          <TableCard maxHeight={230}>
            <table style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '38%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>ERP</th>
                  <th style={{ textAlign: 'right' }}>Conversões</th>
                  <th style={{ textAlign: 'right' }}>Receita</th>
                  <th>Última abertura</th>
                </tr>
              </thead>
              <tbody>
                {campanhas.map((c, i) => (
                  <tr
                    key={i}
                    onClick={() => toggleCamp(i)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{
                      background: selIdx === i ? 'var(--as-azul-apatita-100)' : undefined,
                      fontWeight: 600, fontSize: 12, fontFamily: 'var(--font-sans)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.nm_campanha}
                    </td>
                    <td style={{ background: selIdx === i ? 'var(--as-azul-apatita-100)' : undefined }}>
                      <span className={c.erp === 'Amei' ? 'pill pill-teal' : 'pill pill-navy'}>
                        {c.erp === 'Amei' ? 'Medicina' : 'Odonto'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, background: selIdx === i ? 'var(--as-azul-apatita-100)' : undefined }}>
                      {fmtK(c.conversoes)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, background: selIdx === i ? 'var(--as-azul-apatita-100)' : undefined }}>
                      {fmtBRL(c.receita_atribuida)}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--color-text-tertiary)', background: selIdx === i ? 'var(--as-azul-apatita-100)' : undefined }}>
                      {c.ultima_abertura ? new Date(c.ultima_abertura).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>

      {/* Tipos de conversão */}
      <Section
        title={selName ? `Conversões por tipo — ${selName.substring(0, 40)}` : 'Conversões por tipo'}
        badge={`${tiposData.length} categorias`}
      >
        {loading ? <Loading /> : (
          <TableCard>
            <table style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '34%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Tipo de conversão</th>
                  <th style={{ textAlign: 'right' }}>Conversões</th>
                  <th style={{ textAlign: 'right' }}>Receita atribuída</th>
                  <th style={{ textAlign: 'right' }}>Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {tiposData.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{t.origem}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtK(t.conversoes)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtBRL(t.receita)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {t.conversoes > 0 ? fmtBRL(t.receita / t.conversoes) : '-'}
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
