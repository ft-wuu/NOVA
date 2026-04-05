"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Lobby() {
  const router = useRouter();
  
  // Create Server State
  const [serverName, setServerName] = useState("");
  const [maxMembers, setMaxMembers] = useState(1);
  const [inviteCode, setInviteCode] = useState("");

  // Join Server State
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handleCreateServer = () => {
    if (!serverName) return;
    
    let generatedCode = null;
    if (maxMembers > 1) {
      generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setInviteCode(generatedCode);
    } else {
       router.push(`/server/myserver-123`);
    }
  };

  const handleJoinServer = () => {
    if (!displayName || !joinCode) return;
    router.push(`/server/${joinCode}`);
  };

  const navigateToServer = () => {
     router.push(`/server/${inviteCode || 'myserver-123'}`);
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <header className="header" style={{ position: "absolute" }}>
        <div className="logo">NOVA <span>.AI</span></div>
        <Link href="/">
           <button className="nova-button secondary">Logout</button>
        </Link>
      </header>

      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "1000px", marginTop: "80px" }}>
        
        {/* Create Server */}
        <div className="glass-panel" style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeInUp 0.5s ease-out forwards" }}>
          <h2 style={{ color: "var(--primary-light)" }}>Create a Workspace</h2>
          <p style={{ color: "#aaa", fontSize: "0.9rem" }}>Start a new AI-powered brain-trust.</p>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#ccc", fontSize: "0.9rem" }}>Server Name</label>
            <input 
               type="text" 
               placeholder="e.g. Next Big Tech" 
               value={serverName}
               onChange={(e) => setServerName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#ccc", fontSize: "0.9rem" }}>Max Members (1 - 4)</label>
            <input 
               type="number" 
               min="1" max="4" 
               value={maxMembers}
               onChange={(e) => setMaxMembers(parseInt(e.target.value))}
            />
          </div>

          {inviteCode ? (
             <div style={{ background: "rgba(157, 78, 221, 0.1)", border: "1px solid var(--primary)", padding: "15px", borderRadius: "8px" }}>
               <p style={{ color: "var(--primary-light)", fontSize: "0.9rem", marginBottom: "5px" }}>Invite Code Generated!</p>
               <h3 style={{ letterSpacing: "3px" }}>{inviteCode}</h3>
               <button onClick={navigateToServer} className="nova-button" style={{ width: "100%", marginTop: "15px" }}>Enter Workspace</button>
             </div>
          ) : (
            <button onClick={handleCreateServer} className="nova-button" style={{ width: "100%" }}>Create Server</button>
          )}
        </div>

        {/* Join Server */}
        <div className="glass-panel delay-1" style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeInUp 0.5s ease-out forwards" }}>
          <h2 style={{ color: "var(--accent)" }}>Join a Workspace</h2>
          <p style={{ color: "#aaa", fontSize: "0.9rem" }}>Got an invite code? Enter it below.</p>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#ccc", fontSize: "0.9rem" }}>Display Name</label>
            <input 
               type="text" 
               placeholder="How should we call you?" 
               value={displayName}
               onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#ccc", fontSize: "0.9rem" }}>Server Invite Code</label>
            <input 
               type="text" 
               placeholder="e.g. X7B9K2" 
               value={joinCode}
               onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
          </div>

          <button onClick={handleJoinServer} className="nova-button secondary" style={{ width: "100%", marginTop: "auto" }}>Join Server</button>
        </div>

      </div>
    </main>
  );
}
