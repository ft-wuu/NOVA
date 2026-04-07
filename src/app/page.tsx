import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main style={{ overflowX: 'hidden', position: 'relative', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Dynamic Background Glows */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(157, 78, 221, 0.15) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '-5%', width: '35%', height: '35%', background: 'radial-gradient(circle, rgba(0, 230, 118, 0.08) 0%, transparent 60%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

      <header style={{ 
        height: "80px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0 5%", 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        background: "var(--header-bg)", 
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
        zIndex: 1000 
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-1px', color: 'white' }}>
          NOVA <span style={{ color: 'var(--primary-light)', opacity: 0.8 }}>.AI</span>
        </div>
        <Link href="/login">
          <button className="nova-button">Launch Console</button>
        </Link>
      </header>
      
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8%',
        paddingTop: '100px',
        gap: '60px',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ flex: '1 1 500px' }}>
          <h1 style={{ 
            fontSize: 'max(4.5rem, 5vw)', 
            lineHeight: '0.95', 
            marginBottom: '25px', 
            fontWeight: 900, 
            letterSpacing: '-2px',
            animation: 'fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }}>
            Refine Your <br/> 
            <span style={{ 
              background: 'linear-gradient(90deg, var(--primary-light), var(--accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>Visionary Ideas</span>
            <br /> Into Reality.
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'var(--text-muted)', 
            marginBottom: '40px', 
            maxWidth: '620px', 
            lineHeight: '1.7',
            animation: 'fadeInUp 0.8s 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            opacity: 0
          }}>
            NOVA is a collaborative AI command center for visionaries. Brainstorm with intelligence, automate market research, and build actionable roadmaps in real-time.
          </p>
          <div style={{ 
            display: 'flex', 
            gap: '20px',
            animation: 'fadeInUp 0.8s 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            opacity: 0
          }}>
            <Link href="/login">
              <button className="nova-button" style={{ padding: '18px 40px', fontSize: '1.1rem', borderRadius: '14px' }}>Get Started Free</button>
            </Link>
            <button className="nova-button secondary" style={{ padding: '18px 40px', fontSize: '1.1rem', borderRadius: '14px' }}>Strategy Guide</button>
          </div>
          
          <div className="glass-panel" style={{ 
            marginTop: '60px', 
            display: 'flex', 
            gap: '40px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--glass-border)',
            animation: 'fadeInScale 1s 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            opacity: 0
          }}>
            <div>
              <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>100x</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Velocity</p>
            </div>
            <div style={{ width: '1px', background: 'var(--glass-border)' }} />
            <div>
              <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>Neural</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Intelligence</p>
            </div>
            <div style={{ width: '1px', background: 'var(--glass-border)' }} />
            <div>
              <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>Sync</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Consensus</p>
            </div>
          </div>
        </div>

        <div style={{ 
          flex: '1 1 500px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          animation: 'fadeInScale 1.2s 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
          opacity: 0
        }}>
           <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120%', height: '120%', background: 'radial-gradient(circle, rgba(157, 78, 221, 0.2) 0%, transparent 60%)', filter: 'blur(40px)', zIndex: -1 }} />
              <img 
                src="/nova_hero.png" 
                alt="NOVA AI Interface Abstract" 
                style={{
                   width: '100%',
                   borderRadius: '32px',
                   boxShadow: '0 40px 100px rgba(0, 0, 0, 0.5), 0 0 40px rgba(157, 78, 221, 0.2)',
                   border: '1px solid rgba(255,255,255,0.1)',
                   transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg)'
                }}
              />
           </div>
        </div>
      </section>
    </main>
  );
}
