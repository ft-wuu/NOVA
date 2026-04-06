"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";

export default function Lobby() {
  const router = useRouter();
  
  // Create Server State
  const [serverName, setServerName] = useState("");
  const [maxMembers, setMaxMembers] = useState(1);
  const [inviteCode, setInviteCode] = useState("");
  const [serverIconFile, setServerIconFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Join Server State
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    // We intentionally disable auto-redirect here so users can use the lobby to click on 'Create Server'
    // after leaving another server, or if they just want to see the menu.
    // We rely on the Left Sidebar in the child pages to navigate quickly.
  }, [router]);

  const saveLocalServer = (serverData: any) => {
    let saved = [];
    try {
        const existing = localStorage.getItem("nova_servers");
        if (existing) saved = JSON.parse(existing);
    } catch(e) {}
    
    // Prevent duplicates
    if (!saved.find((s: any) => s.id === serverData.id)) {
        saved.push(serverData);
        localStorage.setItem("nova_servers", JSON.stringify(saved));
    }
  };

  const registerMember = async (serverId: string, username: string) => {
    localStorage.setItem("nova_user", username);
    localStorage.setItem("nova_last_server", serverId);
    
    // Normal registration
    try {
      await setDoc(doc(db, `servers/${serverId}/members`, username), {
        name: username,
        online: true,
        joinedAt: serverTimestamp()
      });
    } catch (e: any) {
      console.warn("Direct member write failed:", e);
    }

    // Failsafe: Write a system message to the chat channel so other users detect the join natively!
    try {
       await addDoc(collection(db, `servers/${serverId}/channels/general-chat/messages`), {
           sender: "SYSTEM",
           type: "system_join",
           targetUser: username,
           timestamp: serverTimestamp()
       });
    } catch (err) {
       console.warn("Failsafe system join broadcast failed:", err);
    }
  };

  const handleCreateServer = async () => {
    if (!serverName || !displayName) return;
    setIsUploading(true);
    
    try {
        let generatedCode = "MYSERVER-123";
        if (maxMembers > 0) {
          generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        
        let iconUrl = "";
        if (serverIconFile) {
            try {
               const storageRef = ref(storage, `server_icons/${generatedCode}_${serverIconFile.name}`);
               const uploadTask = await uploadBytesResumable(storageRef, serverIconFile);
               iconUrl = await getDownloadURL(uploadTask.ref);
            } catch(e) {
               console.error("Image upload failed", e);
            }
        }

        // Run background writes without awaiting them
        setDoc(doc(db, "servers", generatedCode), {
            name: serverName, iconUrl, createdBy: displayName, createdAt: serverTimestamp()
        }).catch(err => console.warn("Firebase root write ignored: ", err));

        saveLocalServer({ id: generatedCode, name: serverName, iconUrl });
        
        setIsUploading(false); // Explicitly unlock the UI IMMEDIATELY
        setInviteCode(generatedCode); // Instantly show the generated code block
        
        // Fire and forget registering
        registerMember(generatedCode, displayName).catch(e => console.warn("Register ignored: ", e));
    } catch(err: any) {
        console.error("Error creating server:", err);
        alert("Failed to create server. Check console for details.");
        setIsUploading(false);
    }
  };

  const handleJoinServer = async () => {
    if (!displayName || !joinCode) return;
    setIsUploading(true);
    
    try {
        const sId = joinCode.toUpperCase();
        let fetchedName = sId;
        let fetchedIcon = "";

        // Use Promise.race to guarantee UI doesn't hang if database is unresponsive
        try {
            const fetchDocPromise = getDoc(doc(db, "servers", sId));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const sDoc: any = await Promise.race([fetchDocPromise, timeoutPromise]);
            
            if (sDoc && sDoc.exists && sDoc.exists()) {
                const data = sDoc.data();
                fetchedName = data.name || sId;
                fetchedIcon = data.iconUrl || "";
            }
        } catch (e) {
             console.warn("Firebase root read timeout/ignored: ", e);
        }

        saveLocalServer({ id: sId, name: fetchedName, iconUrl: fetchedIcon });
        
        setIsUploading(false); // Explicitly unlock UI
        // Give Firebase background tasks a brief window to flush before unmounting!
        registerMember(sId, displayName).catch(e => console.warn("Register ignored: ", e));
        
        await new Promise(resolve => setTimeout(resolve, 800));
        router.push(`/server/${sId}`);
    } catch(err: any) {
        console.error("Error joining server:", err);
        alert("Failed to join server. Check console for details.");
        setIsUploading(false);
    }
  };

  const navigateToServer = () => {
     router.push(`/server/${inviteCode || 'MYSERVER-123'}`);
  }

  const handleLogout = () => {
     localStorage.removeItem("nova_user");
     localStorage.removeItem("nova_last_server");
     localStorage.removeItem("nova_servers");
     alert("Session and Saved Servers cleared!");
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--background)", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", transition: "background 0.5s ease" }}>
      <header className="header">
        <div className="logo" style={{ color: "var(--foreground)" }}>NOVA <span>.AI</span></div>
        <button onClick={handleLogout} className="nova-button secondary">Clear Session</button>
      </header>

      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "1000px", marginTop: "80px" }}>
        
        {/* Create Server */}
        <div className="glass-panel" style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "15px", animation: "fadeInUp 0.5s ease-out forwards", background: "var(--card)", border: "1px solid var(--glass-border)" }}>
          <h2 style={{ color: "var(--primary-light)" }}>Create a Workspace</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Start a new AI-powered brain-trust.</p>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Your Display Name</label>
            <input 
               type="text" 
               placeholder="How should your team see you?" 
               value={displayName}
               onChange={(e) => setDisplayName(e.target.value)}
               disabled={isUploading}
               style={{ background: "var(--input-bg)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Server Name</label>
            <input 
               type="text" 
               placeholder="e.g. Next Big Tech" 
               value={serverName}
               onChange={(e) => setServerName(e.target.value)}
               disabled={isUploading}
               style={{ background: "var(--input-bg)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Server Icon (Optional)</label>
            <input 
               type="file" 
               accept="image/*"
               onChange={(e) => setServerIconFile(e.target.files ? e.target.files[0] : null)}
               style={{ border: "1px dashed var(--glass-border)", padding: "10px", width: "100%", color: "var(--text-muted)", borderRadius: "6px", background: "var(--input-bg)" }}
               disabled={isUploading}
            />
          </div>

          {inviteCode ? (
             <div style={{ background: "rgba(157, 78, 221, 0.1)", border: "1px solid var(--primary)", padding: "15px", borderRadius: "8px", marginTop: "10px" }}>
               <p style={{ color: "var(--primary-light)", fontSize: "0.9rem", marginBottom: "5px" }}>Invite Code Generated!</p>
               <h3 style={{ letterSpacing: "3px", color: "var(--foreground)" }}>{inviteCode}</h3>
               <button onClick={navigateToServer} className="nova-button" style={{ width: "100%", marginTop: "15px" }}>Enter Workspace</button>
             </div>
          ) : (
            <button onClick={handleCreateServer} className="nova-button" style={{ width: "100%", marginTop: "10px" }} disabled={!displayName || !serverName || isUploading}>
                {isUploading ? "Creating..." : "Create Server"}
            </button>
          )}
        </div>

        {/* Join Server */}
        <div className="glass-panel" style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeInUp 0.5s ease-out forwards", background: "var(--card)", border: "1px solid var(--glass-border)" }}>
          <h2 style={{ color: "var(--accent)" }}>Join a Workspace</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Got an invite code? Enter it below.</p>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Display Name</label>
            <input 
               type="text" 
               placeholder="How should we call you?" 
               value={displayName}
               onChange={(e) => setDisplayName(e.target.value)}
               disabled={isUploading}
               style={{ background: "var(--input-bg)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Server Invite Code</label>
            <input 
               type="text" 
               placeholder="e.g. X7B9K2" 
               value={joinCode}
               onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
               disabled={isUploading}
               style={{ background: "var(--input-bg)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}
            />
          </div>

          <button onClick={handleJoinServer} className="nova-button secondary" style={{ width: "100%", marginTop: "auto" }} disabled={!displayName || !joinCode || isUploading}>
              {isUploading ? "Joining..." : "Join Server"}
          </button>
        </div>

      </div>
    </main>
  );
}
