export default function MetricCard({ label, value, delta, deltaLabel, sub, accent }) {
  const isNeg = delta < 0;
  const isPos = delta > 0;
  return (
    <div style={{
      background: 'var(--as-branco)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      boxShadow: 'var(--shadow-xs)',
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22, fontWeight: 900,
        color: 'var(--color-text-primary)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {(delta !== undefined || sub) && (
        <div style={{ marginTop: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {delta !== undefined && (
            <span style={{
              fontWeight: 700,
              color: isNeg ? 'var(--as-vermelho)' : isPos ? 'var(--as-success)' : 'var(--color-text-tertiary)',
            }}>
              {isPos ? '↑' : isNeg ? '↓' : ''} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {deltaLabel && <span style={{ color: 'var(--color-text-tertiary)' }}>{deltaLabel}</span>}
          {sub && !delta && <span style={{ color: 'var(--color-text-tertiary)' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}
