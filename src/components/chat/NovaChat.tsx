"use client";
import { useState, useRef, useEffect } from 'react';
import { useNovaChat } from '../../hooks/useNovaChat';

export default function NovaChat() {
  const { messages, isLoading, sendMessage } = useNovaChat();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const submit = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: "400px", background: 'rgba(2,0,8,0.9)', color: 'white' }}>
      
      {/* Header */}
      <div style={{ padding: "15px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
         <span style={{ fontSize: "1.2rem" }}>🤖</span>
         <h3 style={{ margin: 0, color: "var(--primary-light, #c77dff)", fontSize: "1.1rem" }}>nova-ai</h3>
      </div>

      {/* Message Feed */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
        {messages.length === 0 && (
           <p style={{ color: "#777", textAlign: "center", marginTop: "40px" }}>Start typing! e.g., "@nova-ai I want to build an app for local food waste"</p>
        )}
        
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", gap: "15px", animation: "fadeIn 0.3s ease-out" }}>
            
            {/* Avatar */}
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: m.role === 'user' ? "rgba(255,255,255,0.1)" : "var(--primary, #9d4edd)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
               {m.role === 'user' ? 'U' : '🤖'}
            </div>

            {/* Bubble / Card */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px", color: m.role === 'assistant' ? "var(--primary-light, #c77dff)" : "white" }}>
                  {m.role === 'user' ? 'You' : 'NOVA Bot'}
              </div>
              
              {m.role === 'user' ? (
                 <div style={{ color: "#eee" }}>{m.content}</div>
              ) : (
                 <div style={{ background: "rgba(157, 78, 221, 0.05)", border: "1px solid var(--primary-light, #c77dff)", padding: "20px", borderRadius: "8px" }}>
                   {m.type === 'general' ? (
                     <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
                   ) : (
                     m.structuredData && (
                        <div>
                           <h4 style={{ color: m.type === 'idea_existing' ? '#ffca28' : '#00e676', marginBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "5px" }}>
                             {m.type === 'idea_existing' ? '📊 Market Reality' : '🚀 Fresh Idea'}
                           </h4>
                           <p style={{ lineHeight: 1.5, marginBottom: "15px", color: "#ddd" }}>{m.structuredData.marketReality}</p>
                           
                           {m.structuredData.differentiators && (
                              <div style={{ marginBottom: "15px" }}>
                                <strong style={{ color: "var(--primary-light, #c77dff)" }}>How to stand out:</strong>
                                <ul style={{ paddingLeft: "20px", marginTop: "5px", color: "#ccc", lineHeight: 1.5 }}>
                                  {m.structuredData.differentiators.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                </ul>
                              </div>
                           )}
                           
                           {m.structuredData.roadmap && (
                              <div>
                                <strong style={{ color: "var(--primary-light, #c77dff)" }}>Execution Roadmap:</strong>
                                <ol style={{ paddingLeft: "20px", marginTop: "5px", color: "#ccc", lineHeight: 1.5 }}>
                                  {m.structuredData.roadmap.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                </ol>
                              </div>
                           )}
                        </div>
                     )
                   )}
                 </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
           <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary, #9d4edd)", display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
              <div style={{ color: "var(--primary-light, #c77dff)", fontStyle: "italic", fontSize: "0.9rem" }}>NOVA is thinking...</div>
           </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '20px', borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", gap: "10px", background: "rgba(0,0,0,0.5)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)" }}>
           <input 
             value={input} 
             onChange={(e) => setInput(e.target.value)} 
             onKeyDown={(e) => e.key === 'Enter' && submit()}
             placeholder="Type @nova-ai followed by your message..." 
             style={{ flex: 1, border: 'none', background: 'transparent', color: 'white', outline: 'none', fontSize: "0.95rem" }}
             disabled={isLoading}
           />
           <button 
             onClick={submit} 
             style={{ background: 'transparent', color: input.trim() ? "var(--primary-light, #c77dff)" : "#555", border: "none", cursor: input.trim() ? "pointer" : "default" }}
             disabled={isLoading || !input.trim()}
           >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
           </button>
        </div>
      </div>
    </div>
  );
}
