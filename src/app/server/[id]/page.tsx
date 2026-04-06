"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, where, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function ServerWorkspace() {
  const { id } = useParams<{id: string}>();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState("Unknown member");
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState("general-chat"); // mascot_dm, general-chat, nova-ai, resources, starred
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBotAwake, setIsBotAwake] = useState(false);
  const [savedServers, setSavedServers] = useState<any[]>([]);
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [recentJoinedMsg, setRecentJoinedMsg] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevMembersRef = useRef<any[]>([]);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  useEffect(() => {
    // Session Setup
    const storedUser = localStorage.getItem("nova_user");
    if (storedUser) {
      setCurrentUser(storedUser);
    } else {
      router.push('/lobby');
    }

    // Load saved servers
    try {
       const existing = localStorage.getItem("nova_servers");
       if (existing) setSavedServers(JSON.parse(existing));
    } catch(e) {}

    if (!id || !storedUser) return;

    // Mark user as online when they enter the server
    updateDoc(doc(db, `servers/${id}/members/${storedUser}`), { online: true }).catch(err => console.warn("Online presence ignored:", err));

    // Cleanup presence on tab close or refresh
    const setOffline = () => {
        updateDoc(doc(db, `servers/${id}/members/${storedUser}`), { online: false }).catch(() => {});
    };
    window.addEventListener("beforeunload", setOffline);

    // 1. Guaranteed Local Member Fallback
    const syncLocalMembers = (incomingFirebaseMembers: any[] = []) => {
        let localKnown: any[] = [];
        try {
            const existing = localStorage.getItem(`nova_workspace_members_${id}`);
            if (existing) localKnown = JSON.parse(existing);
        } catch(e) {}

        // Always guarantee currentUser is in the list natively!
        if (!localKnown.find(m => m.name === storedUser)) {
            localKnown.push({ id: storedUser, name: storedUser, online: true });
        } else {
            // Keep currentUser forced online for their own screen
            const me = localKnown.find(m => m.name === storedUser);
            if (me) me.online = true;
        }

        // Merge incoming Firebase data
        incomingFirebaseMembers.forEach(live => {
           const idx = localKnown.findIndex(m => m.name === live.name);
           if (idx >= 0) {
               localKnown[idx].online = live.online;
           } else {
               localKnown.push({ ...live, online: true });
               if (live.name !== storedUser) {
                   setRecentJoinedMsg(`🚀 ${live.name} just joined the workspace!`);
                   setTimeout(() => setRecentJoinedMsg(null), 5000);
               }
           }
        });

        // Any local member who isn't natively returned from Firebase right now is pushed to 'offline' (except current user)
        localKnown = localKnown.map(lk => {
            if (lk.name === storedUser) return lk;
            if (incomingFirebaseMembers.length > 0 && !incomingFirebaseMembers.find(m => m.name === lk.name)) {
                return { ...lk, online: false };
            }
            return lk; // keep their previous offline state if Firebase is totally disconnected
        });

        // Ensure current user is ALWAYS placed at the very top of the list!
        const currentUserObj = localKnown.find(m => m.name === storedUser);
        const others = localKnown.filter(m => m.name !== storedUser);
        const sortedMembers = currentUserObj ? [currentUserObj, ...others] : others;

        localStorage.setItem(`nova_workspace_members_${id}`, JSON.stringify(sortedMembers));
        setMembers(sortedMembers);
    };

    // Trigger explicit initialization
    syncLocalMembers([]);

    // 2. Fetch live members (if FireStore works perfectly)
    const membersUnsub = onSnapshot(collection(db, `servers/${id}/members`), (snapshot) => {
      const liveMembers = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      syncLocalMembers(liveMembers);
    }, (error: any) => {
       console.error("Firebase Security Blocked Member Sync -> Reverting to pure local cache", error);
       // Instead of alerting and failing, we just rely on syncLocalMembers()!
    });

    let q;
    if (activeTab === "starred") {
      q = query(
        collection(db, `servers/${id}/channels/nova-ai/messages`),
        where("starred", "==", true),
        orderBy("timestamp", "asc")
      );
    } else if (activeTab === "mascot_dm") {
      q = query(
         collection(db, `users/${storedUser}/dm_messages`),
         orderBy("timestamp", "asc")
      );
    } else {
      q = query(
        collection(db, `servers/${id}/channels/${activeTab}/messages`),
        orderBy("timestamp", "asc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Failsafe: Add anyone who has ever spoken in the server to the offline members list!
      const uniqueSenders = Array.from(new Set(msgs.map((m: any) => m.sender)));
      const inferredMembers = uniqueSenders
            .filter(name => name !== "NOVA Mascot" && name !== "NOVA Bot" && name !== "SYSTEM" && name !== storedUser)
            .map(name => ({ id: name, name, online: false }));
      
      // Real-time peer discovery! Extract new users from system_join messages
      const systemJoins = msgs
            .filter((m: any) => m.type === "system_join" && m.targetUser && m.targetUser !== storedUser)
            .map((m: any) => ({ id: m.targetUser, name: m.targetUser, online: true }));
            
      const combined = [...inferredMembers, ...systemJoins];
      
      if (combined.length > 0) {
          syncLocalMembers(combined);
      }
    });

    return () => {
      unsubscribe();
      membersUnsub();
      setOffline(); // Mark offline immediately on component unmount
      window.removeEventListener("beforeunload", setOffline);
    };
  }, [id, activeTab, router]);

  const triggerMascotResponse = async (prompt: string) => {
    setIsBotTyping(true);
    try {
      const response = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) 
      });
      const data = await response.json();
      
      const botReport = {
        sender: "NOVA Mascot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: data.error ? `🚨 AI Error: ${data.error}` : (data.isIdea ? (data.marketReality || "No market data found.") : (data.generalResponse || "I'm listening!")),
        uniquenessTips: data.error ? "" : (data.isIdea ? (data.uniquenessTips?.map((t: string) => "• " + t).join('\n') || "") : ""),
        basicStructure: data.error ? "" : (data.isIdea ? (data.roadmap?.map((t: string, i: number) => `${i+1}. ${t}`).join('\n') || "") : ""),
        timestamp: serverTimestamp(),
        starred: false
      };
      
      await addDoc(collection(db, `users/${currentUser}/dm_messages`), botReport);
    } catch(e) { console.error(e) } finally { setIsBotTyping(false); }
  };

  const triggerBotAnalysis = async (prompt: string, targetChannel: string) => {
    setIsBotTyping(true);
    
    try {
      const response = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      });
      
      const data = await response.json();
      
      let existsText = "Information not found.";
      let tipsText = "";
      let structureText = "";

      if (data.error) {
          existsText = `🚨 AI Error: ${data.error}`;
          tipsText = "System encountered a connection roadblock.";
          structureText = "1. Get a FREE Gemini API Key from Google AI Studio\n2. Add GEMINI_API_KEY to Vercel\n3. Redeploy";
      } else if (!data.isIdea) {
          existsText = data.generalResponse || "No response found.";
          tipsText = "";
          structureText = "";
      } else {
          existsText = data.marketReality || "No market data found.";
          if (data.uniquenessTips && Array.isArray(data.uniquenessTips)) {
              tipsText = data.uniquenessTips.map((t: string) => "• " + t).join('\n');
          }
          if (data.roadmap && Array.isArray(data.roadmap)) {
              structureText = data.roadmap.map((t: string, i: number) => `${i+1}. ${t}`).join('\n');
          }
      }

      const botReport = {
        sender: "NOVA Mascot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: existsText,
        uniquenessTips: tipsText,
        basicStructure: structureText,
        timestamp: serverTimestamp(),
        starred: false
      };
      
      await addDoc(collection(db, `servers/${id}/channels/${targetChannel}/messages`), botReport);
    } catch (error) {
      console.error("Error analyzing idea:", error);
      const errorReport = {
        sender: "NOVA Mascot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: "Network connection error.",
        uniquenessTips: "Could not reach the AI core.",
        basicStructure: "Please verify your GEMINI_API_KEY in the Vercel dashboard and ensure your prompt was clear.",
        timestamp: serverTimestamp(),
        starred: false
      };
      await addDoc(collection(db, `servers/${id}/channels/${targetChannel}/messages`), errorReport);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !fileToUpload) return;

    const messageContent = inputValue;
    setInputValue("");
    let fileUrl = null;
    let fileType = null;

    if (fileToUpload) {
      fileType = fileToUpload.type;
      const storageRef = ref(storage, `servers/${id}/resources/${Date.now()}_${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
      
      setFileToUpload(null);
      setUploadProgress(1);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => {
            fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(0);
            resolve();
          }
        );
      });
    }

    const payload = {
      sender: currentUser, type: "user", content: messageContent,
      fileUrl, fileType, timestamp: serverTimestamp(), starred: false
    };

    if (activeTab === "mascot_dm") {
        await addDoc(collection(db, `users/${currentUser}/dm_messages`), payload);
        triggerMascotResponse(messageContent);
        return;
    }

    const targetChannel = activeTab !== 'starred' ? activeTab : 'general-chat';
    await addDoc(collection(db, `servers/${id}/channels/${targetChannel}/messages`), payload);

    const lowerContent = messageContent.toLowerCase();
    
    if (lowerContent.includes("@nova-ai") || (activeTab === "nova-ai" && isBotAwake)) {
        let prompt = messageContent;
        if (lowerContent.includes("@nova-ai")) {
             prompt = messageContent.replace(/@nova-ai/gi, '').trim();
        }

        if (prompt.toLowerCase() === "sleep" || prompt.toLowerCase() === "stop" || prompt.toLowerCase() === "!@nova-ai") {
             setIsBotAwake(false);
             const botReport = { sender: "NOVA Bot", type: "bot_report", ideaPrompt: "Sleep Sequence", exists: "I am Offline.", uniquenessTips: "I will no longer auto-respond.", basicStructure: "Tag `@nova-ai` anytime.", timestamp: serverTimestamp(), starred: false };
             await addDoc(collection(db, `servers/${id}/channels/${targetChannel}/messages`), botReport);
        } else if (prompt.length === 0 && lowerContent.includes("@nova-ai")) {
             setIsBotAwake(true);
             const botReport = { sender: "NOVA Bot", type: "bot_report", ideaPrompt: "Awakening Sequence", exists: "I am Online and listening to this channel!", uniquenessTips: "Any message you type here will now be automatically analyzed.", basicStructure: "Type `@nova-ai sleep` whenever you want me to stop.", timestamp: serverTimestamp(), starred: false };
             await addDoc(collection(db, `servers/${id}/channels/${targetChannel}/messages`), botReport);
        } else if (prompt.trim().length > 0) {
             triggerBotAnalysis(prompt, targetChannel);
        }
    }
  };

  const handleLeaveServer = async () => {
    if (confirm("Are you sure you want to completely leave this server and remove yourself from its member list?")) {
        
        // Calculate smart fallback route (go to adjacent server if exists)
        const index = savedServers.findIndex((s:any) => s.id === id);
        let nextRoute = '/lobby';
        if (savedServers.length > 1) {
            if (index > 0) {
               nextRoute = `/server/${savedServers[index - 1].id}`; // Go to previous
            } else {
               nextRoute = `/server/${savedServers[1].id}`; // Go to next
            }
        }

        // Optimistically remove from local storage so UI updates instantly
        const saved = savedServers.filter((s:any) => s.id !== id);
        localStorage.setItem("nova_servers", JSON.stringify(saved));
        setSavedServers(saved); // Update current state just in case
        
        // Fire and forget delete from Firebase (don't let permission errors block the UI removal)
        deleteDoc(doc(db, `servers/${id}/members/${currentUser}`)).catch(e => console.warn("Firebase member delete ignored: ", e));
        
        router.push(nextRoute);
    }
  };

  const toggleStar = async (messageId: string, currentStatus: boolean, isAiChannel: boolean) => {
    let msgRef;
    if (activeTab === "mascot_dm") {
        msgRef = doc(db, `users/${currentUser}/dm_messages`, messageId);
    } else {
        const channelRef = isAiChannel ? 'nova-ai' : activeTab;
        msgRef = doc(db, `servers/${id}/channels/${channelRef}/messages`, messageId);
    }
    await updateDoc(msgRef, { starred: !currentStatus });
  };

  const renderFile = (url: string, type: string) => {
    if (type.startsWith("image/")) return <img src={url} alt="upload" style={{ maxWidth: "400px", borderRadius: "8px", marginTop: "10px" }} />;
    if (type.startsWith("video/")) return <video controls src={url} style={{ maxWidth: "400px", borderRadius: "8px", marginTop: "10px" }} />;
    return <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--primary-light)", textDecoration: "underline" }}>Download Attached File</a>;
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)", position: "relative" }}>
      
      {/* Notifications Panel & Toggle Button (Bottom Right) */}
      <div style={{ position: "absolute", bottom: "30px", right: "30px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "15px" }}>
          
          {/* Incoming Join Toast (Shows conditionally when panel is closed) */}
          {recentJoinedMsg && !showNotifications && (
             <div style={{ background: "var(--primary)", color: "white", padding: "12px 20px", borderRadius: "8px", boxShadow: "0 4px 15px rgba(157, 78, 221, 0.4)", animation: "fadeInUp 0.3s ease-out forwards", fontWeight: "bold", border: "1px solid var(--primary-light)", display: "flex", alignItems: "center", gap: "10px" }}>
                 <span style={{ fontSize: "1.2rem" }}>🚀</span> {recentJoinedMsg}
             </div>
          )}

          {/* Persistent Notifications Panel */}
          {showNotifications && (
             <div className="glass-panel" style={{ width: "320px", maxHeight: "400px", background: "rgba(10, 10, 15, 0.95)", border: "1px solid var(--primary-light)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(0,0,0,0.8)", animation: "fadeInUp 0.2s", padding: 0 }}>
                 <div style={{ padding: "15px", borderBottom: "1px solid var(--glass-border)", background: "rgba(157, 78, 221, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <h4 style={{ margin: 0, color: "white", display: "flex", alignItems: "center", gap: "8px" }}>🔔 Joining Activity</h4>
                     <button onClick={() => setShowNotifications(false)} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
                 </div>
                 <div style={{ flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "10px" }} className="hide-scroll">
                     {messages.filter(m => m.type === 'system_join').reverse().map((msg: any) => (
                         <div key={msg.id} style={{ background: "var(--glass)", padding: "12px", borderRadius: "8px", borderLeft: "3px solid var(--primary)", fontSize: "0.85rem", color: "#ddd" }}>
                             <strong style={{ color: "var(--primary-light)" }}>{msg.targetUser}</strong> joined the server.
                             <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "4px" }}>
                                 {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Recently"}
                             </div>
                         </div>
                     ))}
                     {messages.filter(m => m.type === 'system_join').length === 0 && (
                         <div style={{ textAlign: "center", padding: "20px", color: "#666", fontSize: "0.85rem" }}>No one has joined this server yet.</div>
                     )}
                 </div>
             </div>
          )}

          {/* Toggle FAB Button */}
          <button 
             onClick={() => setShowNotifications(!showNotifications)}
             style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--primary)", border: "none", color: "white", fontSize: "24px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 4px 15px rgba(157, 78, 221, 0.5)", transition: "all 0.2s" }}
             title="Server Notifications"
          >
             💬
          </button>
      </div>

      {/* 1. FAR LEFT: Discord-Style Server Sidebar */}
      <div style={{ width: "72px", backgroundColor: "#020008", borderRight: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", alignItems: "center", padding: "15px 0", gap: "15px", zIndex: 100, flexShrink: 0 }}>
         {/* Direct Message (NOVA AI Mascot) */}
         <div 
            onClick={() => setActiveTab('mascot_dm')}
            style={{ width: "48px", height: "48px", borderRadius: activeTab === 'mascot_dm' ? "16px" : "50%", background: "var(--glass)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s", overflow: "hidden", border: activeTab === 'mascot_dm' ? "2px solid var(--primary-light)" : "none" }}
            title="Direct Message NOVA Mascot"
         >
             <img src="/nova_mascot.png" alt="NOVA Mascot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
         </div>

         <div style={{ width: "32px", height: "2px", backgroundColor: "var(--glass-border)", borderRadius: "1px" }} />

         {/* Saved Servers List */}
         <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px", width: "100%", alignItems: "center" }} className="hide-scroll">
           {savedServers.map((s: any) => (
               <div 
                  key={s.id}
                  title={s.name}
                  onClick={() => router.push(`/server/${s.id}`)}
                  style={{ width: "48px", height: "48px", minHeight: "48px", borderRadius: id === s.id && activeTab !== 'mascot_dm' ? "16px" : "50%", background: id === s.id && activeTab !== 'mascot_dm' ? "var(--primary)" : "var(--glass)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s", overflow: "hidden", color: "white", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.1)" }}
               >
                   {s.iconUrl ? (
                       <img src={s.iconUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                   ) : (
                       s.name.charAt(0).toUpperCase()
                   )}
               </div>
           ))}
         </div>

         {/* Add Server */}
         <div 
            onClick={() => router.push('/lobby')}
            title="Add a Server"
            style={{ width: "48px", height: "48px", borderRadius: "50%", background: "transparent", border: "1px dashed #555", color: "#555", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s", fontSize: "24px", minHeight: "48px" }}
         >
             +
         </div>
      </div>

      {/* 2. Inner Left Sidebar - Channels */}
      <div style={{ width: "240px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--glass-border)" }}>
           <h3 style={{ color: "var(--primary-light)", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px", fontSize: "1rem" }}>
             <span style={{ fontSize: "1.2rem" }}>✨</span>
             {activeTab === 'mascot_dm' ? "NOVA DIRECT" : "WORKSPACE"}
           </h3>
           <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "5px" }}>
             {activeTab === 'mascot_dm' ? "AI Assistant" : `ID: ${id}`}
           </p>
        </div>

        <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeTab === "mascot_dm" ? (
             <div style={{ textAlign: "center", color: "#aaa", fontSize: "0.85rem", marginTop: "20px" }}>
                <img src="/nova_mascot.png" alt="Mascot" style={{ width: "80px", height: "80px", borderRadius: "16px", marginBottom: "10px", margin: "0 auto", display: "block" }} />
                <p>Chat directly with your cute, intelligent AI mascot without disturbing the team.</p>
             </div>
          ) : (
            <>
              <button 
                 onClick={() => setActiveTab("mascot_dm")} 
                 style={{ width: "100%", background: "linear-gradient(90deg, rgba(157, 78, 221, 0.8) 0%, rgba(0, 230, 118, 0.6) 100%)", borderRadius: "8px", color: "white", fontWeight: "bold", padding: "10px 12px", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", boxShadow: "0 4px 15px rgba(157, 78, 221, 0.3)", transition: "all 0.2s" }}
              >
                 <img src="/nova_mascot.png" style={{width: "24px", height: "24px", borderRadius: "50%"}} alt="AI" />
                 Ask NOVA AI
              </button>

              <p style={{ fontSize: "0.75rem", color: "#666", marginBottom: "5px", textTransform: "uppercase", fontWeight: "bold" }}>Text Channels</p>
              
              <button 
                className="channel-btn"
                onClick={() => setActiveTab("general-chat")}
                style={{ background: activeTab === "general-chat" ? "var(--glass-hover)" : "transparent", color: activeTab === "general-chat" ? "white" : "#aaa", border: "none", width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "1.1rem", color: "#555" }}>#</span> general-chat
              </button>

              <button 
                className="channel-btn"
                onClick={() => setActiveTab("resources")}
                style={{ background: activeTab === "resources" ? "var(--glass-hover)" : "transparent", color: activeTab === "resources" ? "white" : "#aaa", border: "none", width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "1.1rem" }}>📁</span> resources
              </button>

              <div style={{ marginTop: "20px", borderTop: "1px solid var(--glass-border)", paddingTop: "20px" }}>
                <button 
                  className="channel-btn"
                  onClick={() => setActiveTab("starred")}
                  style={{ background: activeTab === "starred" ? "var(--glass-hover)" : "transparent", color: activeTab === "starred" ? "#ffca28" : "#aaa", border: "none", width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "1.1rem" }}>⭐</span> Starred Ideas
                </button>
              </div>
            </>
          )}
        </div>

        {activeTab !== "mascot_dm" && (
           <div style={{ padding: "20px", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.3)" }}>
              <button onClick={handleLeaveServer} className="nova-button secondary" style={{ width: "100%", fontSize: "0.85rem", padding: "8px", borderColor: "#ff4444", color: "#ff4444" }}>Leave Server</button>
           </div>
        )}
      </div>

      {/* 3. Main Content View - Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Chat Header */}
        <div style={{ height: "65px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", padding: "0 20px", background: "rgba(2, 0, 8, 0.8)", backdropFilter: "blur(10px)" }}>
           <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
             {activeTab === "mascot_dm" && <><img src="/nova_mascot.png" alt="Mascot" style={{width: "24px", height:"24px", borderRadius:"6px"}}/> NOVA Mascot <span style={{fontSize: "0.8rem", color: "#888", marginLeft: "10px", fontWeight: "normal"}}>Your personal AI companion.</span></>}
             {activeTab === "general-chat" && <><span style={{ color: "#666" }}>#</span> general-chat</>}
             {activeTab === "nova-ai" && <>🤖 nova-ai <span style={{fontSize: "0.8rem", color: "#888", marginLeft: "10px", fontWeight: "normal"}}>Ask the bot to structure your ideas.</span></>}
             {activeTab === "resources" && <>📁 resources <span style={{fontSize: "0.8rem", color: "#888", marginLeft: "10px", fontWeight: "normal"}}>Share files, images, and videos here.</span></>}
             {activeTab === "starred" && <>⭐ Starred AI Reports</>}
           </h3>
        </div>

        {/* Chat Feed */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
           {messages.length === 0 && (
             <div style={{ margin: "auto", color: "#666", textAlign: "center", maxWidth: "400px" }}>
                <h2 style={{ color: "white", marginBottom: "10px" }}>
                   {activeTab === "mascot_dm" ? "Say hi to NOVA!" : `Welcome to #${activeTab}!`}
                </h2>
                <p>
                   {activeTab === "mascot_dm" 
                      ? "This is your private AI playground (like a ChatGPT interface). Ask anything!" 
                      : "This is the beginning of the channel. Send a message to start syncing with your team."}
                </p>
             </div>
           )}

           {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: "15px", animation: "fadeInUp 0.3s ease-out forwards" }}>
                 {/* Avatar */}
                 <div style={{ width: "45px", height: "45px", borderRadius: msg.sender === "NOVA Mascot" ? "12px" : "50%", background: msg.type === "bot_report" ? "var(--primary)" : "var(--glass)", border: msg.type === "bot_report" ? "2px solid var(--primary-light)" : "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0, boxShadow: msg.type === "bot_report" ? "0 0 10px rgba(157, 78, 221, 0.5)" : "none", overflow: "hidden" }}>
                    {msg.sender === "NOVA Mascot" ? (
                        <img src="/nova_mascot.png" style={{width: "100%", height: "100%", objectFit:"cover"}} alt="Mascot" />
                    ) : ( msg.sender.charAt(0) )}
                 </div>
                 
                 {/* Message Body */}
                 <div style={{ flex: 1, maxWidth: "100%" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
                       <span style={{ fontWeight: "600", fontSize: "0.95rem", color: msg.type === "bot_report" ? "var(--accent)" : "white" }}>
                         {msg.sender}
                       </span>
                       <span style={{ fontSize: "0.75rem", color: "#666" }}>
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Just now"}
                       </span>
                    </div>

                    {msg.type === "user" && (
                       <div style={{ color: "#eee", fontSize: "0.95rem", lineHeight: "1.5" }}>
                         {msg.content}
                         {msg.fileUrl && renderFile(msg.fileUrl, msg.fileType)}
                       </div>
                    )}

                    {msg.type === "system_join" && (
                       <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary-light)", fontSize: "0.95rem", fontStyle: "italic", background: "rgba(157, 78, 221, 0.1)", padding: "8px 12px", borderRadius: "8px", borderLeft: "3px solid var(--primary)", marginTop: "5px" }}>
                         🚀 {msg.targetUser} officially joined the workspace!
                       </div>
                    )}

                    {msg.type === "bot_report" && (
                       <div style={{ marginTop: "5px" }}>
                          {!msg.uniquenessTips && !msg.basicStructure ? (
                            /* Standard Chat Bubble for non-idea replies */
                            <div style={{ color: "#eee", fontSize: "0.95rem", lineHeight: "1.5", background: "rgba(157, 78, 221, 0.15)", padding: "12px 16px", borderRadius: "0 16px 16px 16px", border: "1px solid rgba(157, 78, 221, 0.3)", display: "inline-block", maxWidth: "85%" }}>
                               {msg.exists}
                            </div>
                          ) : (
                            /* Premium Strategy Report for startup ideas */
                            <div className="glass-panel" style={{ padding: "20px", position: "relative", border: "2px solid var(--primary-light)", background: "rgba(157, 78, 221, 0.08)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                               <div style={{ position: "absolute", top: "15px", right: "15px", display: "flex", gap: "10px" }}>
                                  <button 
                                    onClick={() => toggleStar(msg.id, msg.starred, activeTab === 'nova-ai' || activeTab === 'starred')}
                                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", filter: msg.starred ? "grayscale(0)" : "grayscale(1)" }}
                                    title="Star this idea"
                                  >⭐</button>
                               </div>

                               <p style={{ fontStyle: "italic", color: "#aaa", marginBottom: "15px", paddingBottom:"10px", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ color: "var(--primary-light)" }}>📊</span> Analysis for: "{msg.ideaPrompt}"
                               </p>
                               
                               <h4 style={{ color: "var(--primary-light)", marginBottom: "6px", fontSize: "1rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                                  {activeTab === 'mascot_dm' ? 'Insights' : 'Market Reality'}
                               </h4>
                               <p style={{ color: "#fff", marginBottom: "20px", fontSize: "0.95rem", lineHeight: "1.6" }}>{msg.exists}</p>

                               {msg.uniquenessTips && (
                                 <>
                                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                      <span style={{ fontSize: "1.2rem" }}>💡</span>
                                      <h4 style={{ color: "var(--primary-light)", margin: 0, fontSize: "1rem", fontWeight: "700" }}>Killer Edge Tips</h4>
                                   </div>
                                   <p style={{ color: "#eee", marginBottom: "20px", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap", paddingLeft: "12px", borderLeft: "2px solid var(--primary)" }}>{msg.uniquenessTips}</p>
                                 </>
                               )}

                               {msg.basicStructure && (
                                 <>
                                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                      <span style={{ fontSize: "1.2rem" }}>🛠️</span>
                                      <h4 style={{ color: "var(--primary-light)", margin: 0, fontSize: "1rem", fontWeight: "700" }}>Zero-to-One Roadmap</h4>
                                   </div>
                                   <div style={{ color: "#fff", fontSize: "0.95rem", whiteSpace: "pre-wrap", lineHeight: "1.6", background: "rgba(0,0,0,0.5)", padding: "15px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
                                      <div style={{ position: "absolute", top: 0, right: 0, padding: "4px 8px", background: "var(--primary)", fontSize: "0.7rem", fontWeight: "bold" }}>EXECUTION PLAN</div>
                                      {msg.basicStructure}
                                   </div>
                                 </>
                               )}
                            </div>
                          )}
                       </div>
                    )}
                 </div>
              </div>
           ))}

           {isBotTyping && (
              <div style={{ display: "flex", gap: "15px", animation: "fadeInUp 0.3s" }}>
                 <div style={{ width: "45px", height: "45px", borderRadius: activeTab === 'mascot_dm' ? "12px" : "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid var(--primary-light)", overflow: "hidden" }}>
                    {activeTab === 'mascot_dm' ? <img src="/nova_mascot.png" style={{width:"100%"}} /> : "🤖"}
                 </div>
                 <div style={{ color: "var(--primary-light)", fontSize: "0.9rem", display: "flex", alignItems: "center", fontStyle: "italic" }}>
                   NOVA is formulating a response...
                 </div>
              </div>
           )}
           <div ref={endOfMessagesRef} />
        </div>

        {/* Chat Input Bar */}
        {activeTab !== "starred" && (
           <div style={{ padding: "0 20px 20px 20px" }}>
             {fileToUpload && (
               <div style={{ padding: "10px", background: "var(--glass)", borderTopLeftRadius: "8px", borderTopRightRadius: "8px", border: "1px solid var(--glass-border)", borderBottom: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#ccc" }}>📎 Attached: {fileToUpload.name}</span>
                  <button onClick={() => setFileToUpload(null)} style={{ background: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
               </div>
             )}
             
             <div style={{ display: "flex", background: "rgba(0,0,0,0.7)", borderRadius: fileToUpload ? "0 0 8px 8px" : "8px", padding: "10px 15px", alignItems: "center", gap: "10px", border: "1px solid var(--glass-border)" }}>
               
               {activeTab === "resources" && (
                 <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", padding: "5px", transition: "color 0.2s" }}>
                   <input type="file" onChange={(e) => { if (e.target.files && e.target.files[0]) setFileToUpload(e.target.files[0]); }} style={{ display: "none" }} />
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                 </label>
               )}

               <input 
                 type="text" 
                 placeholder={activeTab === "mascot_dm" ? "Chat directly with NOVA..." : `Message #${activeTab}`}
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                 style={{ flex: 1, background: "transparent", border: "none", color: "white", outline: "none", fontSize: "0.95rem", padding: "5px", boxShadow: "none" }}
                 disabled={uploadProgress > 0}
               />
               
               <button 
                 onClick={handleSendMessage} 
                 style={{ background: "transparent", border: "none", color: inputValue || fileToUpload ? "var(--primary-light)" : "#555", cursor: inputValue || fileToUpload ? "pointer" : "default", display: "flex", alignItems: "center", transition: "color 0.2s" }}
                 disabled={(!inputValue && !fileToUpload) || uploadProgress > 0}
               >
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
               </button>
             </div>
             {uploadProgress > 0 && <p style={{ fontSize: "0.75rem", color: "var(--primary-light)", marginTop: "5px" }}>Uploading: {Math.round(uploadProgress)}%</p>}
           </div>
        )}
      </div>

      {/* 4. Right Sidebar - Members */}
      {activeTab !== "mascot_dm" && (
        <div style={{ width: "240px", borderLeft: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
           <div style={{ padding: "20px 20px 10px 20px" }}>
              <h4 style={{ fontSize: "0.8rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>MEMBERS — {members.length}</h4>
           </div>
           
           <div style={{ padding: "10px", overflowY: "auto", flex: 1 }}>
              {members.map(member => (
                <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "6px", cursor: "pointer", transition: "background 0.2s" }} className="channel-btn">
                   <div style={{ position: "relative" }}>
                     <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--glass)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "bold" }}>
                       {member.name.charAt(0)}
                     </div>
                     <div className={`status-indicator ${member.online ? 'status-online' : 'status-offline'}`} style={{ position: "absolute", bottom: "-2px", right: "-2px", border: "2px solid rgba(0,0,0,0.8)" }} />
                   </div>
                   <span style={{ fontSize: "0.9rem", color: member.online ? "white" : "#777", fontWeight: member.online ? "500" : "normal" }}>
                     {member.name} {member.name === currentUser && <span style={{fontSize: "0.75rem", color: "var(--primary-light)"}}>(You)</span>}
                   </span>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
