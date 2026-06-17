// Seção com título e badge
export function Section({ title, badge, children, action }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13, fontWeight: 800,
            color: 'var(--color-text-primary)', margin: 0,
          }}>
            {title}
          </h2>
          {badge !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: 'var(--as-cinza-50)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)',
              padding: '1px 8px', borderRadius: 'var(--radius-pill)',
            }}>
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// Card de tabela
export function TableCard({ children, maxHeight }) {
  return (
    <div style={{
      background: 'var(--as-branco)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-xs)',
      ...(maxHeight ? { maxHeight, overflowY: 'auto' } : {}),
    }}>
      {children}
    </div>
  );
}

// Filtro de período (7/14/30 dias)
export function DateFilter({ value, onChange }) {
  const opts = [{ v: 7, l: '7d' }, { v: 14, l: '14d' }, { v: 30, l: '30d' }];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          fontSize: 12, fontWeight: value === o.v ? 700 : 400,
          fontFamily: 'var(--font-sans)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-mid)',
          cursor: 'pointer',
          background: value === o.v ? 'var(--as-azul-escuro)' : 'transparent',
          color: value === o.v ? 'white' : 'var(--color-text-secondary)',
          transition: 'all 140ms',
        }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// Filtro de ERP
export function ERPFilter({ value, onChange }) {
  const opts = [
    { v: 'todos', l: 'Todos' },
    { v: 'Amei', l: 'Medicina' },
    { v: 'Webdental', l: 'Odonto' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          fontSize: 12, fontWeight: value === o.v ? 700 : 400,
          fontFamily: 'var(--font-sans)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-mid)',
          cursor: 'pointer',
          background: value === o.v ? 'var(--as-azul-apatita)' : 'transparent',
          color: value === o.v ? 'var(--as-azul-escuro)' : 'var(--color-text-secondary)',
          transition: 'all 140ms',
        }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// Mini sparkbar
export function SparkBar({ series }) {
  const max = Math.max(...series, 1);
  const last = series[series.length - 1];
  const avg = series.slice(0, -1).reduce((s, v) => s + v, 0) / (series.length - 1 || 1);
  const isLow = last < avg * 0.8;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22 }}>
      {series.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * 22));
        const isLast = i === series.length - 1;
        return (
          <div key={i} style={{
            width: 5, height: h, borderRadius: '2px 2px 0 0',
            background: isLast
              ? (isLow ? 'var(--as-vermelho-100)' : 'var(--as-azul-apatita)')
              : 'var(--as-cinza-200)',
          }} />
        );
      })}
    </div>
  );
}

// Barra de taxa
export function RateBar({ value, max, color }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="rate-track" style={{ width: 72 }}>
        <div className="rate-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11, fontWeight: 500,
        color: 'var(--color-text-primary)',
        minWidth: 40,
      }}>
        {(value || 0).toFixed(1)}%
      </span>
    </div>
  );
}

// Loading state
export function Loading() {
  return (
    <div style={{
      textAlign: 'center', padding: 40,
      color: 'var(--color-text-tertiary)', fontSize: 13,
      fontFamily: 'var(--font-sans)',
    }}>
      Carregando dados...
    </div>
  );
}

// Formatadores
export const fmtK = n => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n));
};

export const fmtBRL = n => {
  if (n >= 1000000) return 'R$ ' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return 'R$ ' + (n / 1000).toFixed(1) + 'k';
  return 'R$ ' + n.toFixed(2);
};
