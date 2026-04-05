import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main>
      <header className="header">
        <div className="logo">NOVA <span>.AI</span></div>
        <Link href="/login">
          <button className="nova-button">Join NOVA</button>
        </Link>
      </header>
      
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5%',
        paddingTop: '80px',
        gap: '40px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 500px', zIndex: 2 }}>
          <h1 className="fade-in-up" style={{ fontSize: '4rem', lineHeight: '1.1', marginBottom: '20px', fontWeight: 800 }}>
            Refine Your <br/> <span style={{ color: 'var(--primary-light)' }}>Visionary Ideas</span>
            <br /> Into Reality.
          </h1>
          <p className="fade-in-up delay-1" style={{ fontSize: '1.2rem', color: '#b0b0b0', marginBottom: '30px', maxWidth: '600px', lineHeight: '1.6' }}>
            NOVA is a collaborative AI workspace for visionaries. Brainstorm with teammates, test the market uniqueness of your ideas, and let our intelligent bot guide you from raw concept to actionable plan.
          </p>
          <div className="fade-in-up delay-2" style={{ display: 'flex', gap: '15px' }}>
            <Link href="/login">
              <button className="nova-button" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>Get Started</button>
            </Link>
            <button className="nova-button secondary" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>Learn More</button>
          </div>
          
          <div className="fade-in-up delay-3 glass-panel" style={{ marginTop: '50px', display: 'flex', gap: '30px' }}>
            <div>
              <h3 style={{ color: 'var(--primary-light)', fontSize: '1.5rem' }}>100x</h3>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>Faster Execution</p>
            </div>
            <div>
              <h3 style={{ color: 'var(--primary-light)', fontSize: '1.5rem' }}>AI-Powered</h3>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>Instant Research</p>
            </div>
            <div>
              <h3 style={{ color: 'var(--primary-light)', fontSize: '1.5rem' }}>Live</h3>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>Multiplayer Workspaces</p>
            </div>
          </div>
        </div>

        <div className="fade-in-up delay-1" style={{ flex: '1 1 500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <img 
              src="/nova_hero.png" 
              alt="NOVA AI Interface Abstract" 
              style={{
                 maxWidth: '100%',
                 borderRadius: '24px',
                 boxShadow: '0 20px 50px rgba(157, 78, 221, 0.3)',
                 border: '1px solid var(--glass-border)'
              }}
            />
        </div>
      </section>
    </main>
  );
}
