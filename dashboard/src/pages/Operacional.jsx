import { useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';
import { Section, TableCard, RateBar, Loading, fmtK } from '../components/UI.jsx';
import { useEnrollments } from '../hooks/useEnrollments.js';
import { useEmailMetrics } from '../hooks/useEmailMetrics.js';

const HEALTH_LABEL = { ok: 'Normal', warn: 'Atenção', crit: 'Alerta' };

function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }
function daysAgoStr(n) { return format(subDays(new Date(), n - 1), 'yyyy-MM-dd'); }
function toPT(iso) { if (!iso) return ''; const [y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; }
function axisDate(iso) { if (!iso) return ''; const [,m,d]=iso.split('-'); return d+'/'+m; }

// ── Date range picker ─────────────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, quickDays, onChange }) {
  const Q = [{ v:7,l:'7d' },{ v:14,l:'14d' },{ v:30,l:'30d' }];
  const btnStyle = (on) => ({
    fontSize:12, fontWeight: on?700:400, fontFamily:'var(--font-sans)',
    padding:'4px 12px', borderRadius:'var(--radius-md)',
    border:'1px solid var(--color-border-mid)', cursor:'pointer',
    background: on?'var(--as-azul-escuro)':'transparent',
    color: on?'white':'var(--color-text-secondary)', transition:'all 140ms',
  });
  const inputStyle = {
    fontSize:12, padding:'4px 8px', borderRadius:'var(--radius-md)',
    border:'1px solid var(--color-border-mid)',
    background:'var(--color-bg-primary)', color:'var(--color-text-primary)',
    fontFamily:'var(--font-sans)', cursor:'pointer',
  };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      {Q.map(q=>(
        <button key={q.v} style={btnStyle(quickDays===q.v)}
          onClick={()=>onChange({ startDate:daysAgoStr(q.v), endDate:todayStr(), quickDays:q.v })}>
          {q.l}
        </button>
      ))}
      <span style={{ color:'var(--as-cinza-300)', userSelect:'none' }}>|</span>
      <input type="date" value={startDate} style={inputStyle}
        onChange={e=>onChange({ startDate:e.target.value, endDate, quickDays:null })} />
      <span style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>→</span>
      <input type="date" value={endDate} style={inputStyle}
        onChange={e=>onChange({ startDate, endDate:e.target.value, quickDays:null })} />
    </div>
  );
}

// ── Selection banner ──────────────────────────────────────────────────────
function Banner({ names, onClear }) {
  if (!names.length) return null;
  return (
    <div style={{ background:'var(--as-azul-apatita-50)', border:'1px solid var(--as-azul-apatita-200)',
      borderRadius:'var(--radius-md)', padding:'7px 12px', display:'flex', alignItems:'center',
      justifyContent:'space-between', marginBottom:12, fontSize:12, fontFamily:'var(--font-sans)' }}>
      <span style={{ fontWeight:600, color:'var(--as-azul-escuro)' }}>
        Filtrando: {names.join(', ')}
      </span>
      <button onClick={onClear} style={{ background:'none', border:'none', cursor:'pointer',
        fontSize:11, color:'var(--as-azul-apatita-700)', fontFamily:'var(--font-sans)', fontWeight:600 }}>
        ✕ Limpar
      </button>
    </div>
  );
}

// ── Flow inline chart ─────────────────────────────────────────────────────
function FlowChart({ series }) {
  const data = (series||[]).map(d=>({ date:axisDate(d.date), v:d.enrollments }));
  return (
    <div style={{ padding:'10px 14px', background:'var(--color-bg-secondary)', borderTop:'1px solid var(--color-border)' }}>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top:4, right:8, bottom:0, left:0 }}>
          <XAxis dataKey="date" tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }}
            axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }}
            axisLine={false} tickLine={false} tickFormatter={fmtK} width={36} />
          <Tooltip formatter={v=>[fmtK(v),'Inscrições']}
            contentStyle={{ background:'var(--as-branco)', border:'1px solid var(--color-border)',
              borderRadius:8, fontSize:11 }} />
          <Line type="monotone" dataKey="v" name="Inscrições" stroke="#61C1D0"
            strokeWidth={2} dot={{ r:2, fill:'#61C1D0' }} activeDot={{ r:4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Email inline chart (4 linhas) ─────────────────────────────────────────
const ELINES = [
  { key:'Enviados',  color:'#0C223C', dash:'5 3' },
  { key:'Entregues', color:'#61C1D0', dash:null  },
  { key:'Abertos',   color:'#D73834', dash:null  },
  { key:'Clicados',  color:'#E8A33A', dash:'3 2' },
];

function EmailChart({ series }) {
  const data = (series||[]).map(d=>({
    date:axisDate(d.date), Enviados:d.sent, Entregues:d.delivered,
    Abertos:d.opened, Clicados:d.clicked,
  }));
  return (
    <div style={{ padding:'10px 14px', background:'var(--color-bg-secondary)', borderTop:'1px solid var(--color-border)' }}>
      <div style={{ display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' }}>
        {ELINES.map(({ key, color, dash })=>(
          <div key={key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--color-text-tertiary)' }}>
            <svg width="18" height="10">
              <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth="2"
                strokeDasharray={dash||undefined} />
            </svg>
            {key}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top:4, right:8, bottom:0, left:0 }}>
          <XAxis dataKey="date" tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }}
            axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:10, fill:'#888780', fontFamily:'Nunito' }}
            axisLine={false} tickLine={false} tickFormatter={fmtK} width={36} />
          <Tooltip contentStyle={{ background:'var(--as-branco)', border:'1px solid var(--color-border)',
            borderRadius:8, fontSize:11 }} formatter={v=>fmtK(v)} />
          {ELINES.map(({ key, color, dash })=>(
            <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2}
              strokeDasharray={dash||undefined} dot={false} activeDot={{ r:4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Row wrapper (expande abaixo ao clicar) ────────────────────────────────
function ExpandRow({ isSelected, onClick, cells, expandContent }) {
  return (
    <>
      <tr onClick={onClick} style={{
        cursor:'pointer',
        background: isSelected ? 'var(--as-azul-apatita-50)' : 'transparent',
      }}>
        {cells}
      </tr>
      {isSelected && (
        <tr>
          <td colSpan={99} style={{ padding:0, borderBottom:'1px solid var(--color-border)' }}>
            {expandContent}
          </td>
        </tr>
      )}
    </>
  );
}

// ── FluxosTab ─────────────────────────────────────────────────────────────
function FluxosTab({ data, loading, sel, onToggle, onClear }) {
  const active = sel.size > 0 ? data.filter(f=>sel.has(f.flow_id)) : data;
  const anomalias = data.filter(f=>f.health==='crit');
  const totalToday = active.reduce((s,f)=>s+f.today,0);
  const totalAvg   = active.reduce((s,f)=>s+f.avg7d,0);
  const delta = totalAvg > 0 ? ((totalToday-totalAvg)/totalAvg)*100 : 0;
  const selNames = data.filter(f=>sel.has(f.flow_id))
    .map(f=>f.flow_name.replace('AS | ','').replace(' [Não Excluir]','').replace(' [Não excluir]','').substring(0,28));

  const tdBase = (isSel) => ({
    padding:'8px 12px',
    borderBottom: isSel ? 'none' : '1px solid var(--color-border)',
  });

  return (
    <>
      {anomalias.length > 0 && (
        <div style={{ background:'var(--as-vermelho-50)', border:'1px solid var(--as-vermelho-100)',
          borderRadius:'var(--radius-md)', padding:'9px 13px', display:'flex', alignItems:'center',
          gap:9, marginBottom:14, fontSize:12, fontFamily:'var(--font-sans)' }}>
          <AlertTriangle size={14} color="var(--as-vermelho)" />
          <span style={{ fontWeight:700, color:'var(--as-vermelho-600)' }}>Queda detectada:</span>
          <span style={{ color:'var(--as-vermelho-500)' }}>
            {anomalias.map(f=>f.flow_name.replace('AS | ','').replace(' [Não Excluir]','').replace(' [Não excluir]','')).join(', ')}
          </span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
        <MetricCard label="Inscrições hoje" value={fmtK(totalToday)}
          delta={delta} deltaLabel="vs média" accent="var(--as-azul-apatita)" />
        <MetricCard
          label={sel.size>0 ? `${sel.size} fluxo${sel.size>1?'s':''} selecionado${sel.size>1?'s':''}` : 'Fluxos monitorados'}
          value={sel.size>0 ? sel.size : data.length}
          sub={anomalias.length>0 ? `${anomalias.length} em alerta` : 'Todos normais'} />
      </div>

      <Banner names={selNames} onClear={onClear} />

      <Section title="Fluxos de automação" badge={`${data.length} ativos`}
        action={<span style={{ fontSize:11, color:'var(--as-azul-apatita-600)', fontFamily:'var(--font-sans)' }}>← clique para expandir</span>}>
        {loading ? <Loading /> : (
          <TableCard>
            <table style={{ tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:'35%' }}/><col style={{ width:'12%' }}/><col style={{ width:'12%' }}/>
                <col style={{ width:'12%' }}/><col style={{ width:'11%' }}/><col style={{ width:'18%' }}/>
              </colgroup>
              <thead><tr>
                <th>Fluxo</th>
                <th style={{ textAlign:'right' }}>Hoje</th>
                <th style={{ textAlign:'right' }}>D-1</th>
                <th style={{ textAlign:'right' }}>Média</th>
                <th>Var.</th>
                <th>Saúde</th>
              </tr></thead>
              <tbody>
                {data.map(f => {
                  const isSel = sel.has(f.flow_id);
                  const td = tdBase(isSel);
                  return (
                    <ExpandRow key={f.flow_id} isSelected={isSel} onClick={()=>onToggle(f.flow_id)}
                      expandContent={<FlowChart series={f.dailySeries} />}
                      cells={<>
                        <td style={td}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:12, color:isSel?'var(--as-azul-apatita)':'var(--as-cinza-300)', flexShrink:0 }}>
                              {isSel?'▼':'▶'}
                            </span>
                            <div style={{ fontWeight:600, fontSize:12, fontFamily:'var(--font-sans)',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {f.flow_name.replace('AS | ','').replace(' [Não Excluir]','').replace(' [Não excluir]','')}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...td, textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600 }}>{fmtK(f.today)}</td>
                        <td style={{ ...td, textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-text-tertiary)' }}>{fmtK(f.prev)}</td>
                        <td style={{ ...td, textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-text-tertiary)' }}>{fmtK(f.avg7d)}</td>
                        <td style={td}>
                          <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--font-sans)',
                            color:f.dropPct<=-10?'var(--as-vermelho)':f.dropPct>=10?'var(--as-success)':'var(--color-text-tertiary)' }}>
                            {f.dropPct>0?'+':''}{f.dropPct.toFixed(1)}%
                          </span>
                        </td>
                        <td style={td}><span className={`pill pill-${f.health}`}>{HEALTH_LABEL[f.health]}</span></td>
                      </>}
                    />
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>
    </>
  );
}

// ── EmailsTab ─────────────────────────────────────────────────────────────
function EmailsTab({ data, loading, sel, onToggle, onClear }) {
  const active = sel.size > 0 ? data.filter(e=>sel.has(e.email_id)) : data;
  const totalSent = active.reduce((s,e)=>s+e.sent,0);
  const validOpen = active.filter(e=>e.open_rate);
  const avgOpen = validOpen.length ? validOpen.reduce((s,e)=>s+e.open_rate,0)/validOpen.length : 0;
  const selNames = data.filter(e=>sel.has(e.email_id)).map(e=>e.hs_name.substring(0,28));

  const tdBase = (isSel) => ({
    padding:'8px 12px', borderBottom: isSel ? 'none' : '1px solid var(--color-border)',
  });

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
        <MetricCard label="E-mails enviados" value={fmtK(totalSent)}
          sub={`${active.length} campanha${active.length!==1?'s':''}`} accent="var(--as-azul-apatita)" />
        <MetricCard label="Taxa média de abertura" value={`${avgOpen.toFixed(1)}%`}
          sub="no período" accent="var(--as-vermelho)" />
      </div>

      <Banner names={selNames} onClear={onClear} />

      <Section title="E-mails de marketing" badge={`${data.length} campanhas`}
        action={<span style={{ fontSize:11, color:'var(--as-azul-apatita-600)', fontFamily:'var(--font-sans)' }}>← clique para expandir</span>}>
        {loading ? <Loading /> : (
          <TableCard>
            <table style={{ tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:'30%' }}/><col style={{ width:'11%' }}/><col style={{ width:'17%' }}/>
                <col style={{ width:'17%' }}/><col style={{ width:'13%' }}/><col style={{ width:'12%' }}/>
              </colgroup>
              <thead><tr>
                <th>E-mail</th>
                <th style={{ textAlign:'right' }}>Enviados</th>
                <th>Entrega</th>
                <th>Abertura</th>
                <th>Bounce</th>
                <th>Spam</th>
              </tr></thead>
              <tbody>
                {data.map(e => {
                  const isSel = sel.has(e.email_id);
                  const td = tdBase(isSel);
                  return (
                    <ExpandRow key={e.email_id} isSelected={isSel} onClick={()=>onToggle(e.email_id)}
                      expandContent={<EmailChart series={e.dailySeries} />}
                      cells={<>
                        <td style={td}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:12, color:isSel?'var(--as-azul-apatita)':'var(--as-cinza-300)', flexShrink:0 }}>
                              {isSel?'▼':'▶'}
                            </span>
                            <div style={{ fontWeight:600, fontSize:12, fontFamily:'var(--font-sans)',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {e.hs_name}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...td, textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600 }}>{fmtK(e.sent)}</td>
                        <td style={td}><RateBar value={e.delivery_rate||0} max={100}
                          color={(e.delivery_rate||0)>=97?'var(--as-success)':'var(--as-warning)'} /></td>
                        <td style={td}><RateBar value={e.open_rate||0} max={80} color="var(--as-azul-apatita)" /></td>
                        <td style={td}>
                          <span className={`pill ${(e.hard_bounce_rate||0)<0.5?'pill-ok':(e.hard_bounce_rate||0)<1.5?'pill-warn':'pill-crit'}`}>
                            {(e.hard_bounce_rate||0).toFixed(2)}%
                          </span>
                        </td>
                        <td style={td}>
                          <span className={`pill ${(e.spam_rate||0)<0.05?'pill-ok':(e.spam_rate||0)<0.1?'pill-warn':'pill-crit'}`}>
                            {(e.spam_rate||0).toFixed(3)}%
                          </span>
                        </td>
                      </>}
                    />
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>
    </>
  );
}

// ── Operacional (página) ──────────────────────────────────────────────────
export default function Operacional() {
  const [range, setRange]   = useState({ startDate:daysAgoStr(7), endDate:todayStr(), quickDays:7 });
  const [tab, setTab]       = useState('fluxos');
  const [selF, setSelF]     = useState(new Set());
  const [selE, setSelE]     = useState(new Set());

  const { data:flows,  loading:fLoad } = useEnrollments(range.startDate, range.endDate);
  const { data:emails, loading:eLoad } = useEmailMetrics(range.startDate, range.endDate);

  const toggleF = useCallback(id => setSelF(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }), []);
  const toggleE = useCallback(id => setSelE(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }), []);

  const tabBtn = (active) => ({
    fontSize:13, padding:'8px 16px', cursor:'pointer',
    borderBottom: active ? '2px solid var(--as-azul-apatita)' : '2px solid transparent',
    color: active ? 'var(--as-azul-apatita)' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400, fontFamily:'var(--font-sans)',
    marginBottom:'-1px', background:'none', border:'none',
    borderBottom: active ? '2px solid var(--as-azul-apatita)' : '2px solid transparent',
    transition:'all 140ms',
  });

  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        marginBottom:16, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:900, margin:0 }}>
            Monitoramento Operacional
          </h1>
          <p style={{ fontSize:12, color:'var(--color-text-tertiary)', margin:'3px 0 0', fontFamily:'var(--font-sans)' }}>
            {toPT(range.startDate)} → {toPT(range.endDate)}
          </p>
        </div>
        <DateRangePicker {...range}
          onChange={r => { setRange(r); setSelF(new Set()); setSelE(new Set()); }} />
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--color-border)', marginBottom:16, gap:4 }}>
        <button style={tabBtn(tab==='fluxos')} onClick={()=>setTab('fluxos')}>Fluxos de automação</button>
        <button style={tabBtn(tab==='emails')} onClick={()=>setTab('emails')}>E-mails</button>
      </div>

      {tab==='fluxos'
        ? <FluxosTab data={flows} loading={fLoad} sel={selF} onToggle={toggleF} onClear={()=>setSelF(new Set())} />
        : <EmailsTab data={emails} loading={eLoad} sel={selE} onToggle={toggleE} onClear={()=>setSelE(new Set())} />
      }
    </div>
  );
}
