import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Database } from 'lucide-react';

const SUGGESTED = [
  'Quais fluxos tiveram maior queda nos últimos 7 dias?',
  'Qual campanha gerou mais receita nos últimos 30 dias?',
  'Como está a taxa de conversão de confirmações por canal?',
  'Campanhas de Odonto com maior ticket médio?',
  'Quais e-mails têm taxa de abertura acima de 30%?',
  'Resuma o desempenho do cVortex pós-consulta do mês.',
];

function Msg({ role, content }) {
  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 16,
      flexDirection: role === 'user' ? 'row-reverse' : 'row',
    }} className="fade-in">
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: role === 'user' ? 'var(--as-azul-escuro)' : 'var(--as-azul-apatita-50)',
        border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {role === 'user'
          ? <User size={13} color="white" />
          : <Bot size={13} color="var(--as-azul-apatita-700)" />
        }
      </div>
      <div className={role === 'user' ? 'chat-user' : 'chat-agent'}>
        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)' }}>
          {content}
        </div>
      </div>
    </div>
  );
}

export default function Agente() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setStatus('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let agentText = '';
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const p = JSON.parse(data);
            if (p.status) {
              setStatus(p.status);
            } else if (p.text) {
              setStatus('');
              if (!started) {
                started = true;
                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
              }
              agentText += p.text;
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: 'assistant', content: agentText };
                return u;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com o agente. Verifique se a API key está configurada.' }]);
    } finally {
      setLoading(false);
      setStatus('');
      inputRef.current?.focus();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 54, height: 54,
                background: 'var(--as-azul-apatita-50)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
                border: '1px solid var(--as-azul-apatita-200)',
              }}>
                <Sparkles size={22} color="var(--as-azul-apatita-700)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, margin: '0 0 6px' }}>
                Agente Analista CRM
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', maxWidth: 380, lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-sans)' }}>
                Faça perguntas sobre fluxos, e-mails, confirmações e receita.
                O agente consulta os dados reais do Supabase antes de responder.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, maxWidth: 640, width: '100%' }}>
              {SUGGESTED.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{
                  background: 'var(--as-branco)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '10px 14px',
                  cursor: 'pointer', textAlign: 'left',
                  fontSize: 12, color: 'var(--color-text-secondary)',
                  lineHeight: 1.6, fontFamily: 'var(--font-sans)',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'border-color 140ms, box-shadow 140ms',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--as-azul-apatita)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {messages.map((m, i) => <Msg key={i} role={m.role} content={m.content} />)}

            {loading && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--as-azul-apatita-50)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={13} color="var(--as-azul-apatita-700)" />
                </div>
                <div className="chat-agent" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {status ? (
                    <>
                      <Database size={12} color="var(--as-azul-apatita)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>
                        {status}
                      </span>
                    </>
                  ) : (
                    [0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--as-cinza-300)',
                        animation: `pulse 1.2s ${i * 0.2}s infinite`,
                      }} />
                    ))
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div style={{
        background: 'var(--as-branco)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Pergunte sobre fluxos, e-mails, confirmações ou receita..."
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 13,
            color: 'var(--color-text-primary)',
            background: 'transparent', fontFamily: 'var(--font-sans)',
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            border: 'none',
            background: input.trim() && !loading ? 'var(--as-azul-apatita)' : 'var(--as-cinza-100)',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 140ms', flexShrink: 0,
          }}
        >
          <Send size={14} color={input.trim() && !loading ? 'var(--as-azul-escuro)' : 'var(--as-cinza-400)'} />
        </button>
      </div>
    </div>
  );
}
