import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Activity, TrendingUp, Bot } from 'lucide-react';

const NAV = [
  { to: '/operacional', Icon: Activity,   label: 'Operacional',  desc: 'Fluxos e e-mails' },
  { to: '/estrategico', Icon: TrendingUp, label: 'Estratégico',  desc: 'Atribuição e ROI' },
  { to: '/agente',      Icon: Bot,        label: 'Agente',       desc: 'Análise por IA' },
];

const S = {
  shell: {
    display: 'flex', height: '100vh', overflow: 'hidden',
  },
  sidebar: {
    width: 220,
    background: 'var(--as-azul-escuro)',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,.06)',
  },
  logoArea: {
    padding: '18px 16px 16px',
    borderBottom: '1px solid rgba(255,255,255,.08)',
  },
  logoImg: { height: 30, objectFit: 'contain' },
  nav: { padding: '12px 8px', flex: 1 },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,.08)',
  },
  footerText: { fontSize: 10, color: 'rgba(255,255,255,.3)', lineHeight: 1.6 },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    background: 'var(--as-gelo)',
  },
  topbar: {
    height: 48,
    background: 'var(--as-branco)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex', alignItems: 'center',
    padding: '0 24px', gap: 8, flexShrink: 0,
    boxShadow: 'var(--shadow-xs)',
  },
  content: { flex: 1, overflow: 'auto', padding: 24 },
};

export default function Layout() {
  const { pathname } = useLocation();
  const current = NAV.find(n => pathname.startsWith(n.to));

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logoArea}>
          <img
            src="/assets/logo-horizontal-white.png"
            alt="AmorSaúde"
            style={S.logoImg}
          />
        </div>

        <nav style={S.nav}>
          {NAV.map(({ to, Icon, label, desc }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 'var(--radius-md)',
                  marginBottom: 2, cursor: 'pointer',
                  background: isActive ? 'rgba(97,193,208,.16)' : 'transparent',
                  transition: 'background 140ms',
                }}>
                  <Icon
                    size={16}
                    color={isActive ? 'var(--as-azul-apatita)' : 'rgba(255,255,255,.35)'}
                  />
                  <div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      fontFamily: 'var(--font-sans)',
                      color: isActive ? 'white' : 'rgba(255,255,255,.4)',
                      lineHeight: 1.2,
                    }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 1 }}>
                      {desc}
                    </div>
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={S.footer}>
          <div style={S.footerText}>
            Atualizado diariamente às 8h<br />
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={S.main}>
        <header style={S.topbar}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--as-success)', flexShrink: 0,
          }} className="pulse" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {current?.label || 'Dashboard'}
          </span>
          <span style={{ color: 'var(--as-cinza-200)', margin: '0 2px' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {current?.desc}
          </span>
        </header>

        <main style={S.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
