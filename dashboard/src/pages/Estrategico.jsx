import { useState, useMemo, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, Legend,
} from 'recharts';
import MetricCard from '../components/MetricCard.jsx';
import { Section, TableCard, Loading, fmtK, fmtBRL } from '../components/UI.jsx';
import { FLOW_MAP } from '../lib/flowMap.js';
import { useAttributionData } from '../hooks/useAttributionData.js';
import { useCvortex } from '../hooks/useCvortex.js';
import { useEnrollments } from '../hooks/useEnrollments.js';
import { useEmailMetrics } from '../hooks/useEmailMetrics.js';
import {
  calcMetrics, calcCanais, calcEspecialidades, calcTopCampanhas,
  calcFatByMonth, calcPerEmail, filterBU, isPaid,
} from '../lib/attributionHelpers.js';

// ── helpers ───────────────────────────────────────────────────────────────
function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgoStr(n) { return format(subDays(new Date(), n - 1), 'yyyy-MM-dd'); }
function toPT(iso) { if (!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }

const CANAL_COLORS = { 'Clínica': '#61C1D0', 'App Cartão de Todos': '#0C223C', 'Multicanal': '#E8A33A', 'Desconhecido': '#A8B3BF' };
const canalColor = l => CANAL_COLORS[l] || '#A8B3BF';

// ── DateRangePicker ───────────────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, quickDays, onChange }) {
  const Q = [{ v:7,l:'7d' },{ v:30,l:'30d' },{ v:90,l:'90d' }];
  const btn = on => ({
    fontSize:12, fontWeight:on?700:400, fontFamily:'var(--font-sans)',
    padding:'4px 12px', borderRadius:'var(--radius-md)',
    border:'1px solid var(--color-border-mid)', cursor:'pointer',
    background:on?'var(--as-azul-escuro)':'transparent',
    color:on?'white':'var(--color-text-secondary)', transition:'all 140ms',
  });
  const inp = { fontSize:12, padding:'4px 8px', borderRadius:'var(--radius-md)',
    border:'1px solid var(--color-border-mid)', background:'var(--color-bg-primary)',
    color:'var(--color-text-primary)', fontFamily:'var(--font-sans)', cursor:'pointer' };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      {Q.map(q=>(
        <button key={q.v} style={btn(quickDays===q.v)}
          onClick={()=>onChange({ startDate:daysAgoStr(q.v), endDate:todayStr(), quickDays:q.v })}>
          {q.l}
        </button>
      ))}
      <span style={{ color:'var(--as-cinza-300)', userSelect:'none' }}>|</span>
      <input type="date" value={startDate} style={inp}
        onChange={e=>onChange({ startDate:e.target.value, endDate, quickDays:null })} />
      <span style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>→</span>
      <input type="date" value={endDate} style={inp}
        onChange={e=>onChange({ startDate, endDate:e.target.value, quickDays:null })} />
    </div>
  );
}

// ── BU filter ─────────────────────────────────────────────────────────────
function BUFilter({ value, onChange }) {
  const opts = [{ v:'todos',l:'Todos' },{ v:'medicina',l:'Medicina' },{ v:'odontologia',l:'Odonto' }];
  return (
    <div style={{ display:'flex', gap:4 }}>
      {opts.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)} style={{
          fontSize:12, fontWeight:value===o.v?700:400, fontFamily:'var(--font-sans)',
          padding:'4px 12px', borderRadius:'var(--radius-md)',
          border:'1px solid var(--color-border-mid)', cursor:'pointer',
          background:value===o.v?'var(--as-azul-apatita)':'transparent',
          color:value===o.v?'var(--as-azul-escuro)':'var(--color-text-secondary)',
          transition:'all 140ms',
        }}>{o.l}</button>
      ))}
    </div>
  );
}

// ── Funil ─────────────────────────────────────────────────────────────────
function Funil({ inscricoes, enviados, abertos, agendamentos, atendimentos, propostas, fatTotal }) {
  const max = inscricoes || enviados || 1;
  const stages = [
    { label:'Inscrições', val:inscricoes, color:'#0C223C' },
    { label:'E-mails enviados', val:enviados, color:'#266773' },
    { label:'E-mails abertos', val:abertos, color:'#44A9B8' },
    { label:'Agendamentos', val:agendamentos, color:'#D73834' },
    { label:'Atendimentos', val:atendimentos, color:'#BD2A26' },
    { label:'Propostas pagas', val:propostas, color:'#E8A33A' },
  ];
  return (
    <div style={{ background:'var(--color-bg-secondary)', padding:'12px 14px', borderTop:'1px solid var(--color-border)' }}>
      {stages.map((s, i) => {
        const w = Math.max(2, Math.round((s.val / max) * 100));
        const pct = i === 0 ? 100 : max > 0 ? Math.round(s.val / max * 1000) / 10 : 0;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <div style={{ fontSize:11, color:'var(--color-text-secondary)', minWidth:140, textAlign:'right', flexShrink:0 }}>
              {s.label}
            </div>
            <div style={{ flex:1, background:'var(--color-border)', borderRadius:3, height:20, overflow:'hidden' }}>
              <div style={{ width:`${w}%`, height:'100%', background:s.color, borderRadius:3, display:'flex', alignItems:'center', paddingLeft:7 }}>
                {w > 12 && <span style={{ fontSize:10, color:'white', fontWeight:600 }}>{fmtK(s.val)}</span>}
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--color-text-tertiary)', minWidth:90 }}>
              <b style={{ color:'var(--color-text-primary)' }}>{w <= 12 ? fmtK(s.val) : ''}</b>
              {pct < 100 ? ` · ${pct}%` : ''}
            </div>
          </div>
        );
      })}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6, marginTop:8, paddingTop:7, borderTop:'1px solid var(--color-border)' }}>
        <span style={{ fontSize:11, color:'var(--color-text-secondary)' }}>Faturamento total atribuído</span>
        <span style={{ fontSize:15, fontWeight:700, fontFamily:'var(--font-display)', color:'var(--as-vermelho)' }}>{fmtBRL(fatTotal)}</span>
      </div>
    </div>
  );
}

// ── Tabela e-mails individuais ─────────────────────────────────────────────
function EmailTable({ emails, emailMetrics, attrRows }) {
  const TH = ({ children, red, right }) => (
    <th style={{ textAlign:right?'right':'left', color:red?'var(--as-vermelho)':'var(--color-text-tertiary)' }}>
      {children}
    </th>
  );
  const rows = emails.map(nm => {
    const em = emailMetrics.find(e => e.hs_name === nm) || {};
    const m  = calcPerEmail(attrRows, nm);
    return { nm, ...em, ...m };
  });
  const tot = {
    sent: rows.reduce((s,r)=>s+(r.sent||0),0),
    opened: rows.reduce((s,r)=>s+(r.opened||0),0),
    agendamentos: rows.reduce((s,r)=>s+(r.agendamentos||0),0),
    atendimentos: rows.reduce((s,r)=>s+(r.atendimentos||0),0),
    valor_atend: rows.reduce((s,r)=>s+(r.valor_atend||0),0),
    qt_propostas: rows.reduce((s,r)=>s+(r.qt_propostas||0),0),
    qt_propostas_pagas: rows.reduce((s,r)=>s+(r.qt_propostas_pagas||0),0),
    fat_pos: rows.reduce((s,r)=>s+(r.fat_pos||0),0),
    fat_odo: rows.reduce((s,r)=>s+(r.fat_odo||0),0),
    fat_total: rows.reduce((s,r)=>s+(r.fat_total||0),0),
  };
  const td = (v, red) => ({
    textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11,
    color: red ? 'var(--as-vermelho)' : 'var(--color-text-primary)', fontWeight: red ? 600 : 400,
  });
  const dash = v => v > 0 ? fmtBRL(v) : '—';
  return (
    <div style={{ overflowX:'auto', borderRadius:'var(--radius-lg)', border:'1px solid var(--color-border)' }}>
      <table style={{ tableLayout:'fixed', minWidth:1020 }}>
        <colgroup>
            <col style={{ width:'18%' }}/><col style={{ width:'7%' }}/><col style={{ width:'7%' }}/>
            <col style={{ width:'8%' }}/><col style={{ width:'7%' }}/><col style={{ width:'9%' }}/>
            <col style={{ width:'7%' }}/><col style={{ width:'7%' }}/><col style={{ width:'8%' }}/><col style={{ width:'8%' }}/><col style={{ width:'8%' }}/>
          </colgroup>
        <thead>
          <tr>
            <TH>E-mail</TH>
            <TH right>Enviados</TH>
            <TH right>Aberturas</TH>
            <TH right>Agendamentos</TH>
            <TH right>Atendimentos</TH>
            <TH right red>Valor atend.</TH>
            <TH right>Qt Propostas</TH>
            <TH right>Qt Prop. Pagas</TH>
            <TH right red>Fat. Pós</TH>
            <TH right red>Fat. Odonto</TH>
            <TH right red>Fat. Total</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight:600, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'7px 12px' }}>{r.nm}</td>
              <td style={td(r.sent||0)}>{fmtK(r.sent||0)}</td>
              <td style={td(r.opened||0)}>{fmtK(r.opened||0)}</td>
              <td style={td(r.agendamentos||0)}>{fmtK(r.agendamentos||0)}</td>
              <td style={td(r.atendimentos||0)}>{fmtK(r.atendimentos||0)}</td>
              <td style={td(r.valor_atend||0, true)}>{dash(r.valor_atend||0)}</td>
              <td style={td(r.qt_propostas||0)}>{fmtK(r.qt_propostas||0)}</td>
              <td style={td(r.qt_propostas_pagas||0)}>{fmtK(r.qt_propostas_pagas||0)}</td>
              <td style={td(r.fat_pos||0, true)}>{dash(r.fat_pos||0)}</td>
              <td style={td(r.fat_odo||0, true)}>{dash(r.fat_odo||0)}</td>
              <td style={td(r.fat_total||0, true)}>{dash(r.fat_total||0)}</td>
            </tr>
          ))}
          <tr style={{ background:'var(--color-bg-secondary)', fontWeight:600 }}>
            <td style={{ padding:'7px 12px', fontWeight:700, borderTop:'1px solid var(--color-border)' }}>Total do fluxo</td>
            <td style={{ ...td(tot.sent), borderTop:'1px solid var(--color-border)' }}>{fmtK(tot.sent)}</td>
            <td style={{ ...td(tot.opened), borderTop:'1px solid var(--color-border)' }}>{fmtK(tot.opened)}</td>
            <td style={{ ...td(tot.agendamentos), borderTop:'1px solid var(--color-border)' }}>{fmtK(tot.agendamentos)}</td>
            <td style={{ ...td(tot.atendimentos), borderTop:'1px solid var(--color-border)' }}>{fmtK(tot.atendimentos)}</td>
            <td style={{ ...td(tot.valor_atend, true), borderTop:'1px solid var(--color-border)' }}>{dash(tot.valor_atend)}</td>
            <td style={{ ...td(tot.qt_propostas), borderTop:'1px solid var(--color-border)' }}>{fmtK(tot.qt_propostas)}</td>
            <td style={{ ...td(tot.qt_propostas_pagas), borderTop:'1px solid var(--color-border)' }}>{fmtK(tot.qt_propostas_pagas)}</td>
            <td style={{ ...td(tot.fat_pos, true), borderTop:'1px solid var(--color-border)' }}>{dash(tot.fat_pos)}</td>
            <td style={{ ...td(tot.fat_odo, true), borderTop:'1px solid var(--color-border)' }}>{dash(tot.fat_odo)}</td>
            <td style={{ ...td(tot.fat_total, true), borderTop:'1px solid var(--color-border)' }}>{dash(tot.fat_total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Canal bars ─────────────────────────────────────────────────────────────
function CanalBars({ canais }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {canais.slice(0,5).map((c, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'var(--color-text-secondary)', minWidth:130 }}>{c.label}</span>
          <div style={{ flex:1, background:'var(--color-border)', borderRadius:2, height:12, overflow:'hidden' }}>
            <div style={{ width:`${c.pct}%`, height:'100%', background:canalColor(c.label), borderRadius:2 }} />
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, minWidth:36, textAlign:'right' }}>
            {c.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── FlowCard ──────────────────────────────────────────────────────────────
function FlowCard({ flow, attrRows, emailMetrics, enrollments }) {
  const [open, setOpen] = useState(false);

  const flowRows   = useMemo(() => attrRows.filter(r => flow.emails.includes(r.nm_campanha)), [attrRows, flow.emails]);
  const m          = useMemo(() => calcMetrics(flowRows), [flowRows]);
  const canais     = useMemo(() => calcCanais(flowRows), [flowRows]);
  const enrollment = enrollments.find(e => e.flow_id === flow.flowId);
  const inscricoes = enrollment ? enrollment.dailySeries.reduce((s, d) => s + d.enrollments, 0) : 0;
  const enviados   = emailMetrics.filter(e => flow.emails.includes(e.hs_name)).reduce((s, e) => s + e.sent, 0);
  const abertos    = emailMetrics.filter(e => flow.emails.includes(e.hs_name)).reduce((s, e) => s + e.opened, 0);

  const BU_STYLE = {
    Medicina:    { background:'#FDECEA', color:'#A32D2D' },
    Odonto:      { background:'#ECF8FA', color:'#1A4A53' },
    Ambos:       { background:'#E8ECF1', color:'#0C223C' },
  };

  return (
    <div style={{ background:'var(--color-bg-primary)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:8 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          padding:'11px 14px', cursor:'pointer',
          background: open ? 'var(--as-azul-apatita-50)' : 'transparent',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
          transition:'background 120ms',
        }}
      >
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
            <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:'var(--radius-pill)', ...(BU_STYLE[flow.bu] || BU_STYLE.Ambos) }}>
              {flow.bu}
            </span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--color-text-primary)', fontFamily:'var(--font-sans)' }}>
              {flow.flowName}
            </span>
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {[
              { l:'Inscrições', v: fmtK(inscricoes) },
              { l:'Enviados',   v: fmtK(enviados) },
              { l:'Abertos',    v: fmtK(abertos) },
              { l:'Agendamentos', v: fmtK(m.agendamentos) },
              { l:'Propostas pagas', v: fmtK(m.propostas_pagas) },
              { l:'Receita total', v: fmtBRL(m.fat_total), red: true },
            ].map((k, i) => (
              <div key={i} style={{ fontSize:11, color:'var(--color-text-secondary)' }}>
                {k.l}: <span style={{ fontWeight:600, color: k.red ? 'var(--as-vermelho)' : 'var(--color-text-primary)' }}>{k.v}</span>
              </div>
            ))}
          </div>
        </div>
        <span style={{ fontSize:18, color:'var(--color-text-tertiary)', transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s', marginLeft:8 }}>
          ▾
        </span>
      </div>

      {open && (
        <>
          <div style={{ padding:'0 0 4px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'.07em', padding:'12px 14px 6px' }}>
              Funil de conversão
            </div>
            <Funil
              inscricoes={inscricoes}
              enviados={enviados}
              abertos={abertos}
              agendamentos={m.agendamentos}
              atendimentos={m.atendimentos}
              propostas={m.propostas_pagas}
              fatTotal={m.fat_total}
            />
          </div>

          <div style={{ padding:'12px 14px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8, paddingBottom:5, borderBottom:'1px solid var(--color-border)' }}>
              E-mails individuais
            </div>
            <EmailTable emails={flow.emails} emailMetrics={emailMetrics} attrRows={attrRows} />
          </div>

          {canais.length > 0 && (
            <div style={{ padding:'0 14px 14px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8, paddingBottom:5, borderBottom:'1px solid var(--color-border)' }}>
                Canais de agendamento
              </div>
              <CanalBars canais={canais} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────
function OverviewTab({ rows, loading }) {
  const m        = useMemo(() => calcMetrics(rows), [rows]);
  const esps     = useMemo(() => calcEspecialidades(rows).slice(0, 10), [rows]);
  const top      = useMemo(() => calcTopCampanhas(rows, 8), [rows]);
  const canais   = useMemo(() => calcCanais(rows), [rows]);
  const fatM     = useMemo(() => calcFatByMonth(rows), [rows]);
  const convenios = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const conv = r.nm_convenio || 'Outros';
      map[conv] = (map[conv]||0) + (Number(r.conversoes)||0);
    }
    const total = Object.values(map).reduce((s,v)=>s+v,0);
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,4)
      .map(([l,v])=>({ label:l, count:v, pct:total>0?Math.round(v/total*100):0 }));
  }, [rows]);

  const txAg  = m.fat_total > 0 && m.agendamentos > 0 ? ((m.agendamentos / (m.propostas_pagas||1)) * 100).toFixed(1) : '—';

  const CANAL_PIE_COLORS = ['#61C1D0','#0C223C','#E8A33A','#A8B3BF','#D73834'];

  if (loading) return <Loading />;

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:14 }}>
        <MetricCard label="Receita atribuída" value={fmtBRL(m.fat_total)} sub="status: Quitadas + Efetivado" accent="var(--as-azul-apatita)" />
        <MetricCard label="Propostas pagas"   value={fmtK(m.propostas_pagas)} sub={`TM ${fmtBRL(m.ticket_medio)}`} />
        <MetricCard label="Agendamentos"       value={fmtK(m.agendamentos)} sub="origem Agendamento" />
        <MetricCard label="Atendimentos"       value={fmtK(m.atendimentos)} sub="pós consulta medicina" accent="var(--as-vermelho)" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:20 }}>
        <MetricCard label="Fat. Pós Consulta"  value={fmtBRL(m.fat_pos)} sub="medicina paga" />
        <MetricCard label="Fat. Odontologia"   value={fmtBRL(m.fat_odo)} sub="Webdental + Webvidas" />
        <MetricCard label="Qt. Propostas"      value={fmtK(m.qt_propostas)} sub="todas origens pós" />
        <MetricCard label="Qt. Prop. Pagas"    value={fmtK(m.qt_propostas_pagas)} sub="Quitadas + Executada" />
        <MetricCard label="Valor atendimento"  value={fmtBRL(m.valor_atend)} sub="agendamento quitado" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.4fr) minmax(0,1fr)', gap:14, marginBottom:20 }}>
        <div style={{ background:'var(--color-bg-primary)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:14 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10, fontFamily:'var(--font-sans)' }}>Faturamento por origem e mês</div>
          <div style={{ display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' }}>
            {[{ c:'#D73834',l:'Pós Consulta' },{ c:'#61C1D0',l:'Atendimento' },{ c:'#0C223C',l:'Odontologia' }].map(({ c,l }) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--color-text-tertiary)' }}>
                <div style={{ width:10, height:10, borderRadius:2, background:c }} />{l}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fatM} margin={{ top:4, right:8, bottom:0, left:0 }}>
              <XAxis dataKey="month" tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }} axisLine={false} tickLine={false} tickFormatter={v => fmtBRL(v)} width={52} />
              <Tooltip formatter={v => fmtBRL(v)} contentStyle={{ background:'var(--as-branco)', border:'1px solid var(--color-border)', borderRadius:8, fontSize:11 }} />
              <Line type="monotone" dataKey="pos"   stroke="#D73834" strokeWidth={2} dot={{ r:2 }} name="Pós Consulta" />
              <Line type="monotone" dataKey="atend" stroke="#61C1D0" strokeWidth={2} dot={{ r:2 }} name="Atendimento" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="odo"   stroke="#0C223C" strokeWidth={2} dot={{ r:2 }} name="Odontologia" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:'var(--color-bg-primary)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:14, overflow:'hidden' }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8, fontFamily:'var(--font-sans)' }}>Top campanhas</div>
          <table style={{ width:'100%', tableLayout:'fixed', borderCollapse:'collapse' }}>
            <colgroup><col style={{ width:'55%' }}/><col style={{ width:'22%' }}/><col style={{ width:'23%' }}/></colgroup>
            <thead><tr>
              <th style={{ fontSize:10, fontWeight:600, color:'var(--color-text-tertiary)', textAlign:'left', padding:'5px 8px', borderBottom:'1px solid var(--color-border)', textTransform:'uppercase', letterSpacing:'.06em' }}>Campanha</th>
              <th style={{ fontSize:10, fontWeight:600, color:'var(--color-text-tertiary)', textAlign:'right', padding:'5px 8px', borderBottom:'1px solid var(--color-border)', textTransform:'uppercase', letterSpacing:'.06em' }}>Conversões</th>
              <th style={{ fontSize:10, fontWeight:600, color:'var(--as-vermelho)', textAlign:'right', padding:'5px 8px', borderBottom:'1px solid var(--color-border)', textTransform:'uppercase', letterSpacing:'.06em' }}>Receita</th>
            </tr></thead>
            <tbody>
              {top.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'5px 8px', borderBottom:'1px solid var(--color-border)' }}>
                    {c.nm_campanha.replace('AS | ','').replace('ODONTO | ','')}
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:11, textAlign:'right', padding:'5px 8px', borderBottom:'1px solid var(--color-border)' }}>{fmtK(c.conversoes)}</td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:11, textAlign:'right', color:'var(--as-vermelho)', fontWeight:600, padding:'5px 8px', borderBottom:'1px solid var(--color-border)' }}>{fmtBRL(c.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div style={{ background:'var(--color-bg-primary)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:14 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10, fontFamily:'var(--font-sans)' }}>Principais especialidades</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={esps} layout="vertical" margin={{ left:0, right:8 }}>
              <XAxis type="number" tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
              <YAxis type="category" dataKey="label" width={160} tick={{ fontSize:11, fill:'#5A6675', fontFamily:'Nunito' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => fmtK(v)} contentStyle={{ background:'var(--as-branco)', border:'1px solid var(--color-border)', borderRadius:8, fontSize:11 }} />
              <Bar dataKey="count" radius={[0,4,4,0]} maxBarSize={18} fill="#0C223C" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:'var(--color-bg-primary)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:14 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8, fontFamily:'var(--font-sans)' }}>Canais de agendamento</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={canais.slice(0,5)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                {canais.slice(0,5).map((c, i) => <Cell key={i} fill={CANAL_PIE_COLORS[i] || '#A8B3BF'} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [fmtK(v), name]} contentStyle={{ background:'var(--as-branco)', border:'1px solid var(--color-border)', borderRadius:8, fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
            {canais.slice(0,5).map((c, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--color-text-tertiary)' }}>
                <div style={{ width:9, height:9, borderRadius:2, background:CANAL_PIE_COLORS[i] || '#A8B3BF' }} />
                {c.label} {c.pct}%
              </div>
            ))}
          </div>

          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Convênios</div>
            <CanalBars canais={convenios} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── EmailsTab ─────────────────────────────────────────────────────────────
function EmailsTab({ attrRows, emailMetrics, enrollments, loading }) {
  // Campanhas sazonais = emails que aparecem nos attrRows mas não estão em nenhum fluxo
  const mappedEmails = useMemo(() => new Set(FLOW_MAP.flatMap(f => f.emails)), []);
  const sazRows      = useMemo(() => attrRows.filter(r => !mappedEmails.has(r.nm_campanha)), [attrRows, mappedEmails]);
  const sazNomes     = useMemo(() => [...new Set(sazRows.map(r => r.nm_campanha))], [sazRows]);

  if (loading) return <Loading />;

  return (
    <>
      <Section title="Fluxos de automação" badge={`${FLOW_MAP.length} fluxos · ${FLOW_MAP.reduce((s,f)=>s+f.emails.length,0)} e-mails`}>
        {FLOW_MAP.map(flow => (
          <FlowCard key={flow.flowId} flow={flow} attrRows={attrRows} emailMetrics={emailMetrics} enrollments={enrollments} />
        ))}
      </Section>

      {sazNomes.length > 0 && (
        <Section title="Campanhas sazonais" badge={`${sazNomes.length} e-mails`}
          action={<span style={{ fontSize:11, color:'var(--color-text-tertiary)', fontFamily:'var(--font-sans)', fontStyle:'italic' }}>E-mails de marketing sem fluxo vinculado</span>}>
          <div style={{ background:'var(--color-bg-secondary)', borderRadius:'var(--radius-md)', padding:'7px 12px', marginBottom:10, fontSize:11, color:'var(--color-text-tertiary)', fontStyle:'italic' }}>
            Campanhas pontuais não vinculadas a fluxo de automação
          </div>
          <EmailTable emails={sazNomes} emailMetrics={emailMetrics} attrRows={sazRows} />
        </Section>
      )}
    </>
  );
}

// ── WhatsAppTab ───────────────────────────────────────────────────────────
function WhatsAppTab({ rows, loading }) {
  const med = rows.filter(r => r.bu === 'medicina');
  const odo = rows.filter(r => r.bu === 'odontologia');

  const totalMed  = med.reduce((s, r) => s + (Number(r.conversoes)||0), 0);
  const recMed    = med.reduce((s, r) => s + (Number(r.receita)||0), 0);
  const totalOdo  = odo.reduce((s, r) => s + (Number(r.conversoes)||0), 0);
  const recOdo    = odo.reduce((s, r) => s + (Number(r.receita)||0), 0);
  const tmMed     = totalMed > 0 ? recMed / totalMed : 0;
  const tmOdo     = totalOdo > 0 ? recOdo / totalOdo : 0;

  function agg(rows, key) {
    const map = {};
    for (const r of rows) {
      const k = r[key] || 'Outros';
      if (!map[k]) map[k] = { conversoes:0, receita:0 };
      map[k].conversoes += Number(r.conversoes)||0;
      map[k].receita    += Number(r.receita)||0;
    }
    return Object.entries(map).sort((a,b)=>b[1].receita-a[1].receita)
      .map(([label,v]) => ({ label, ...v, tm: v.conversoes > 0 ? v.receita/v.conversoes : 0 }));
  }

  const medStatus = useMemo(() => agg(med, 'situacao_pagamento'), [med]);
  const odoTipo   = useMemo(() => agg(odo, 'tipo_tratamento'), [odo]);

  if (loading) return <Loading />;

  const TH = ({ children, right }) => (
    <th style={{ textAlign:right?'right':'left', padding:'6px 10px', fontSize:10, fontWeight:600, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid var(--color-border)', background:'var(--color-bg-secondary)' }}>
      {children}
    </th>
  );
  const TD = (v, red) => ({ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11, color:red?'var(--as-vermelho)':'var(--color-text-primary)', fontWeight:red?600:400, padding:'7px 10px', borderBottom:'1px solid var(--color-border)' });

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:20 }}>
        <MetricCard label="Propostas Medicina"   value={fmtK(totalMed)} sub="cVortex pós consulta" accent="var(--as-vermelho)" />
        <MetricCard label="Receita Medicina"     value={fmtBRL(recMed)} sub={`TM ${fmtBRL(tmMed)}`} />
        <MetricCard label="Tratamentos Odonto"   value={fmtK(totalOdo)} sub="cVortex odontologia" accent="var(--as-azul-apatita)" />
        <MetricCard label="Receita Odonto"       value={fmtBRL(recOdo)} sub={`TM ${fmtBRL(tmOdo)}`} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <Section title="Medicina — por situação de pagamento">
            <TableCard>
              <table style={{ tableLayout:'fixed' }}>
                <colgroup><col style={{ width:'40%' }}/><col style={{ width:'20%' }}/><col style={{ width:'20%' }}/><col style={{ width:'20%' }}/></colgroup>
                <thead><tr><TH>Status</TH><TH right>Conversões</TH><TH right>Receita</TH><TH right>TM</TH></tr></thead>
                <tbody>
                  {medStatus.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid var(--color-border)', fontSize:11 }}>
                        <span style={{ display:'inline-block', fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:'var(--radius-pill)', background:'var(--color-bg-secondary)', color:'var(--color-text-secondary)' }}>
                          {r.label}
                        </span>
                      </td>
                      <td style={TD(r.conversoes)}>{fmtK(r.conversoes)}</td>
                      <td style={TD(r.receita, true)}>{fmtBRL(r.receita)}</td>
                      <td style={TD(r.tm)}>{fmtBRL(r.tm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </Section>
        </div>

        <div>
          <Section title="Odontologia — por tipo de tratamento">
            <TableCard>
              <table style={{ tableLayout:'fixed' }}>
                <colgroup><col style={{ width:'40%' }}/><col style={{ width:'20%' }}/><col style={{ width:'20%' }}/><col style={{ width:'20%' }}/></colgroup>
                <thead><tr><TH>Tratamento</TH><TH right>Conversões</TH><TH right>Receita</TH><TH right>TM</TH></tr></thead>
                <tbody>
                  {odoTipo.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding:'7px 10px', borderBottom:'1px solid var(--color-border)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.label}
                      </td>
                      <td style={TD(r.conversoes)}>{fmtK(r.conversoes)}</td>
                      <td style={TD(r.receita, true)}>{fmtBRL(r.receita)}</td>
                      <td style={TD(r.tm)}>{fmtBRL(r.tm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </Section>
        </div>
      </div>
    </>
  );
}

// ── Estrategico (página) ──────────────────────────────────────────────────
export default function Estrategico() {
  const [range, setRange] = useState({ startDate:daysAgoStr(30), endDate:todayStr(), quickDays:30 });
  const [bu, setBU]       = useState('todos');
  const [tab, setTab]     = useState('overview');

  const { rows: allRows, loading: aLoad } = useAttributionData(range.startDate, range.endDate);
  const { rows: cvRows,  loading: cLoad } = useCvortex(range.startDate, range.endDate, bu);
  const { data: enrollments }             = useEnrollments(range.startDate, range.endDate);
  const { data: emailMetrics }            = useEmailMetrics(range.startDate, range.endDate);

  const rows = useMemo(() => filterBU(allRows, bu), [allRows, bu]);

  const tabBtn = active => ({
    fontSize:13, padding:'8px 16px', cursor:'pointer',
    borderBottom: active ? '2px solid var(--as-azul-apatita)' : '2px solid transparent',
    color: active ? 'var(--as-azul-apatita)' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400, fontFamily:'var(--font-sans)',
    background:'none', border:'none',
    borderBottom: active ? '2px solid var(--as-azul-apatita)' : '2px solid transparent',
    marginBottom:'-1px', transition:'all 140ms',
  });

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:900, margin:0 }}>
            Dashboard Estratégico
          </h1>
          <p style={{ fontSize:12, color:'var(--color-text-tertiary)', margin:'3px 0 0', fontFamily:'var(--font-sans)' }}>
            {toPT(range.startDate)} → {toPT(range.endDate)}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <BUFilter value={bu} onChange={setBU} />
          <DateRangePicker {...range} onChange={r => setRange(r)} />
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--color-border)', marginBottom:16, gap:4 }}>
        <button style={tabBtn(tab==='overview')} onClick={()=>setTab('overview')}>Visão geral</button>
        <button style={tabBtn(tab==='emails')}   onClick={()=>setTab('emails')}>E-mails</button>
        <button style={tabBtn(tab==='whatsapp')} onClick={()=>setTab('whatsapp')}>WhatsApp</button>
      </div>

      {tab==='overview'  && <OverviewTab  rows={rows} loading={aLoad} />}
      {tab==='emails'    && <EmailsTab    attrRows={rows} emailMetrics={emailMetrics} enrollments={enrollments} loading={aLoad} />}
      {tab==='whatsapp'  && <WhatsAppTab  rows={cvRows} loading={cLoad} />}
    </div>
  );
}
