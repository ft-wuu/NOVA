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
    <main style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", padding: "40px 20px", transition: "background 0.5s ease", position: "relative" }}>
      {/* Background Accents */}
      <div style={{ position: "fixed", top: "0", right: "0", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(157, 78, 221, 0.05) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      
      <header style={{ 
        height: "70px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0 5%", 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        background: "rgba(2, 2, 5, 0.5)", 
        backdropFilter: "blur(15px)",
        borderBottom: "1px solid var(--glass-border)",
        zIndex: 1000 
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>NOVA <span style={{ color: 'var(--primary-light)' }}>.AI</span></div>
        <button onClick={handleLogout} className="nova-button secondary" style={{ padding: "8px 20px" }}>Secure Sign Out</button>
      </header>

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: "1100px", marginTop: "60px", position: "relative", zIndex: 1 }}>
        
        {/* Create Server */}
        <div className="glass-panel" style={{ flex: "1 1 450px", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeInUp 0.6s ease-out forwards" }}>
          <div style={{ paddingBottom: "10px", borderBottom: "1px solid var(--glass-border)" }}>
             <h2 style={{ color: "white", fontWeight: "800", fontSize: "1.5rem" }}>Establish Workspace</h2>
             <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>Start a high-intelligence collaborative unit.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>Commander Identity</label>
              <input 
                 type="text" 
                 placeholder="Enter your callsign..." 
                 value={displayName}
                 onChange={(e) => setDisplayName(e.target.value)}
                 disabled={isUploading}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>Workspace Name</label>
              <input 
                 type="text" 
                 placeholder="e.g. Project 'Nova Core'" 
                 value={serverName}
                 onChange={(e) => setServerName(e.target.value)}
                 disabled={isUploading}
              />
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>Protocol Icon</label>
              <div style={{ position: "relative" }}>
                 <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setServerIconFile(e.target.files ? e.target.files[0] : null)}
                    style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }}
                    disabled={isUploading}
                 />
                 <div style={{ border: "1px dashed var(--glass-border)", padding: "12px", borderRadius: "10px", background: "var(--input-bg)", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                    {serverIconFile ? serverIconFile.name : "Upload Neural Icon (Optional)"}
                 </div>
              </div>
            </div>
          </div>

          {inviteCode ? (
             <div style={{ background: "rgba(157, 78, 221, 0.08)", border: "1px solid var(--primary-light)", padding: "20px", borderRadius: "14px", marginTop: "10px", textAlign: "center", animation: "fadeInScale 0.4s ease-out" }}>
               <p style={{ color: "var(--primary-light)", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "10px", textTransform: "uppercase" }}>Access Key Generated</p>
               <h2 style={{ letterSpacing: "5px", color: "white", fontSize: "2rem", fontWeight: "900" }}>{inviteCode}</h2>
               <button onClick={navigateToServer} className="nova-button" style={{ width: "100%", marginTop: "20px" }}>Enter Authorization Zone</button>
             </div>
          ) : (
            <button onClick={handleCreateServer} className="nova-button" style={{ width: "100%", marginTop: "10px", padding: "16px" }} disabled={!displayName || !serverName || isUploading}>
                {isUploading ? "Initializing..." : "Broadcast Workspace"}
            </button>
          )}
        </div>

        {/* Join Server */}
        <div className="glass-panel" style={{ flex: "1 1 450px", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeInUp 0.6s 0.2s ease-out forwards", opacity: 0 }}>
          <div style={{ paddingBottom: "10px", borderBottom: "1px solid var(--glass-border)" }}>
             <h2 style={{ color: "var(--accent)", fontWeight: "800", fontSize: "1.5rem" }}>Synchronize Units</h2>
             <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>Enter an existing authorization key.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>Member Callsign</label>
              <input 
                 type="text" 
                 placeholder="How will the team see you?" 
                 value={displayName}
                 onChange={(e) => setDisplayName(e.target.value)}
                 disabled={isUploading}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase" }}>Access Key</label>
              <input 
                 type="text" 
                 placeholder="e.g. X1-Y2-Z3" 
                 value={joinCode}
                 onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                 disabled={isUploading}
                 style={{ letterSpacing: "2px", fontWeight: "bold" }}
              />
            </div>
          </div>

          <button onClick={handleJoinServer} className="nova-button secondary" style={{ width: "100%", marginTop: "auto", padding: "16px", borderColor: "var(--accent)", color: "var(--accent)" }} disabled={!displayName || !joinCode || isUploading}>
              {isUploading ? "Synchronizing..." : "Link to Protocol"}
          </button>
        </div>

      </div>
    </main>
  );
}
