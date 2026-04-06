"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { db, storage } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, where } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export default function ServerWorkspace() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState("Unknown member");
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState("general-chat"); // general-chat, nova-ai, resources, starred
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBotAwake, setIsBotAwake] = useState(false);
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  useEffect(() => {
    // Session Setup
    const storedUser = localStorage.getItem("nova_user");
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    if (!id) return;

    // Fetch live members
    const membersUnsub = onSnapshot(collection(db, `servers/${id}/members`), (snapshot) => {
      const liveMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(liveMembers);
    });

    let q;
    if (activeTab === "starred") {
      // Fetch only starred bot reports (from nova-ai channel for simplicity)
      q = query(
        collection(db, `servers/${id}/channels/nova-ai/messages`),
        where("starred", "==", true),
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
    });

    return () => {
      unsubscribe();
      membersUnsub();
    };
  }, [id, activeTab]);

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
      setUploadProgress(1); // To show progress indicator locally if needed

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Upload failed", error);
            reject(error);
          },
          async () => {
            fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(0);
            resolve();
          }
        );
      });
    }

    const payload = {
      sender: currentUser,
      type: "user",
      content: messageContent,
      fileUrl,
      fileType,
      timestamp: serverTimestamp(),
      starred: false
    };

    // Save user message to the active channel
    await addDoc(collection(db, `servers/${id}/channels/${activeTab !== 'starred' ? activeTab : 'general-chat'}/messages`), payload);

    if (activeTab === "nova-ai" && messageContent.trim()) {
      if (messageContent.toLowerCase() === "@nova-ai") {
         setIsBotAwake(true);
         const botReport = {
          sender: "NOVA Bot",
          type: "bot_report",
          ideaPrompt: "Awakening Sequence",
          exists: "I am Online.",
          uniquenessTips: "I am now actively listening to this channel! Any message you type here will be automatically analyzed.",
          basicStructure: "Type `!@nova-ai` whenever you want me to go back to sleep.",
          timestamp: serverTimestamp(),
          starred: false
         };
         await addDoc(collection(db, `servers/${id}/channels/nova-ai/messages`), botReport);
      } else if (messageContent.toLowerCase() === "!@nova-ai") {
         setIsBotAwake(false);
         const botReport = {
          sender: "NOVA Bot",
          type: "bot_report",
          ideaPrompt: "Sleep Sequence",
          exists: "I am Offline.",
          uniquenessTips: "I will no longer respond to your messages in this channel.",
          basicStructure: "Type `@nova-ai` to wake me up again.",
          timestamp: serverTimestamp(),
          starred: false
         };
         await addDoc(collection(db, `servers/${id}/channels/nova-ai/messages`), botReport);
      } else if (isBotAwake) {
         triggerBotAnalysis(messageContent);
      }
    }
  };

  const triggerBotAnalysis = async (prompt: string) => {
    setIsBotTyping(true);
    
    try {
      const response = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
      });
      
      const data = await response.json();
      
      let existsText = "Information not found.";
      let tipsText = "No tips generated.";
      let structureText = "No structure generated.";

      // Handle general chat vs structured idea analysis
      if (data.type === 'general') {
          existsText = data.content || "No response";
          tipsText = "General conversational response. Idea tips not applicable.";
          structureText = "No execution roadmap mapped for general queries.";
      } else if (data.data) {
          existsText = data.data.marketReality || "No market data found.";
          if (data.data.differentiators && Array.isArray(data.data.differentiators)) {
              tipsText = data.data.differentiators.map((t: string) => "• " + t).join('\n');
          }
          if (data.data.roadmap && Array.isArray(data.data.roadmap)) {
              structureText = data.data.roadmap.map((s: string, i: number) => (i+1) + ". " + s).join('\n');
          }
      }

      const botReport = {
        sender: "NOVA Bot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: existsText,
        uniquenessTips: tipsText,
        basicStructure: structureText,
        timestamp: serverTimestamp(),
        starred: false
      };
      
      await addDoc(collection(db, `servers/${id}/channels/nova-ai/messages`), botReport);
    } catch (error) {
      console.error("Error analyzing idea:", error);
      const errorReport = {
        sender: "NOVA Bot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: "Network or Server Error.",
        uniquenessTips: "Could not connect to the Claude API or the API key is unauthorized.",
        basicStructure: "Please verify your ANTHROPIC_API_KEY in the Vercel dashboard and ensure your prompt was clear.",
        timestamp: serverTimestamp(),
        starred: false
      };
      await addDoc(collection(db, `servers/${id}/channels/nova-ai/messages`), errorReport);
    } finally {
      setIsBotTyping(false);
    }
  };

  const toggleStar = async (messageId: string, currentStatus: boolean, isAiChannel: boolean) => {
    const channelRef = isAiChannel ? 'nova-ai' : activeTab;
    const msgRef = doc(db, `servers/${id}/channels/${channelRef}/messages`, messageId);
    await updateDoc(msgRef, {
      starred: !currentStatus
    });
  };

  const renderFile = (url: string, type: string) => {
    if (type.startsWith("image/")) {
      return <img src={url} alt="upload" style={{ maxWidth: "400px", borderRadius: "8px", marginTop: "10px" }} />;
    } else if (type.startsWith("video/")) {
      return <video controls src={url} style={{ maxWidth: "400px", borderRadius: "8px", marginTop: "10px" }} />;
    }
    return <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--primary-light)", textDecoration: "underline" }}>Download Attached File</a>;
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)" }}>
      {/* 1. Left Sidebar - Channels */}
      <div style={{ width: "240px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--glass-border)" }}>
           <h3 style={{ color: "var(--primary-light)", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
             <span style={{ fontSize: "1.2rem" }}>✨</span>
             WORKSPACE
           </h3>
           <p style={{ fontSize: "0.75rem", color: "#888", marginTop: "5px" }}>ID: {id}</p>
        </div>

        <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
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
             onClick={() => setActiveTab("nova-ai")}
             style={{ background: activeTab === "nova-ai" ? "var(--glass-hover)" : "transparent", color: activeTab === "nova-ai" ? "var(--primary-light)" : "#aaa", border: "none", width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
           >
             <span style={{ fontSize: "1.1rem" }}>🤖</span> nova-ai
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
        </div>

        <div style={{ padding: "20px", borderTop: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.3)" }}>
           <Link href="/lobby">
              <button className="nova-button secondary" style={{ width: "100%", fontSize: "0.85rem", padding: "8px" }}>Leave Server</button>
           </Link>
        </div>
      </div>

      {/* 2. Main Content View - Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Chat Header */}
        <div style={{ height: "65px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", padding: "0 20px", background: "rgba(2, 0, 8, 0.8)", backdropFilter: "blur(10px)" }}>
           <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
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
                <h2 style={{ color: "white", marginBottom: "10px" }}>Welcome to {activeTab === "starred" ? "Starred Ideas" : `#${activeTab}`}!</h2>
                <p>This is the beginning of the channel. Send a message to start syncing with your team.</p>
             </div>
           )}

           {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: "15px", animation: "fadeInUp 0.3s ease-out forwards" }}>
                 {/* Avatar */}
                 <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: msg.type === "bot_report" ? "var(--primary)" : "var(--glass)", border: msg.type === "bot_report" ? "2px solid var(--primary-light)" : "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0, boxShadow: msg.type === "bot_report" ? "0 0 10px rgba(157, 78, 221, 0.5)" : "none" }}>
                    {msg.sender.charAt(0)}
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

                    {msg.type === "bot_report" && (
                       <div className="glass-panel" style={{ padding: "20px", position: "relative", marginTop: "10px", border: "1px solid var(--primary-light)", background: "rgba(157, 78, 221, 0.05)", borderRadius: "8px" }}>
                          <div style={{ position: "absolute", top: "15px", right: "15px", display: "flex", gap: "10px" }}>
                             <button 
                               onClick={() => toggleStar(msg.id, msg.starred, activeTab === 'nova-ai' || activeTab === 'starred')}
                               style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", filter: msg.starred ? "grayscale(0)" : "grayscale(1)" }}
                               title="Star this idea"
                             >⭐</button>
                          </div>

                          <p style={{ fontStyle: "italic", color: "#aaa", marginBottom: "15px", paddingBottom:"10px", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.9rem" }}>Analysis for: "{msg.ideaPrompt}"</p>
                          
                          <h4 style={{ color: "var(--primary-light)", marginBottom: "4px", fontSize: "0.95rem" }}>Market Reality</h4>
                          <p style={{ color: "#ddd", marginBottom: "15px", fontSize: "0.9rem", lineHeight: "1.5" }}>{msg.exists}</p>

                          <h4 style={{ color: "var(--primary-light)", marginBottom: "4px", fontSize: "0.95rem" }}>Uniqueness Tips</h4>
                          <p style={{ color: "#ddd", marginBottom: "15px", fontSize: "0.9rem", lineHeight: "1.5" }}>{msg.uniquenessTips}</p>

                          <h4 style={{ color: "var(--primary-light)", marginBottom: "4px", fontSize: "0.95rem" }}>Implementation Structure</h4>
                          <p style={{ color: "#ddd", fontSize: "0.9rem", whiteSpace: "pre-wrap", lineHeight: "1.5", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "6px", fontFamily: "monospace" }}>{msg.basicStructure}</p>
                       </div>
                    )}
                 </div>
              </div>
           ))}

           {isBotTyping && (
              <div style={{ display: "flex", gap: "15px", animation: "fadeInUp 0.3s" }}>
                 <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid var(--primary-light)" }}>🤖</div>
                 <div style={{ color: "var(--primary-light)", fontSize: "0.9rem", display: "flex", alignItems: "center", fontStyle: "italic" }}>
                   NOVA AI is formulating a response...
                 </div>
              </div>
           )}
           <div ref={endOfMessagesRef} />
        </div>

        {/* Chat Input Bar */}
        {activeTab !== "starred" && (
           <div style={{ padding: "0 20px 20px 20px" }}>
             {/* File Preview before sending */}
             {fileToUpload && (
               <div style={{ padding: "10px", background: "var(--glass)", borderTopLeftRadius: "8px", borderTopRightRadius: "8px", border: "1px solid var(--glass-border)", borderBottom: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#ccc" }}>📎 Attached: {fileToUpload.name}</span>
                  <button onClick={() => setFileToUpload(null)} style={{ background: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
               </div>
             )}
             
             <div style={{ display: "flex", background: "rgba(0,0,0,0.7)", borderRadius: fileToUpload ? "0 0 8px 8px" : "8px", padding: "10px 15px", alignItems: "center", gap: "10px", border: "1px solid var(--glass-border)" }}>
               
               {activeTab === "resources" && (
                 <label style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", padding: "5px", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color="white"} onMouseOut={e => e.currentTarget.style.color="#aaa"}>
                   <input 
                     type="file" 
                     onChange={(e) => {
                       if (e.target.files && e.target.files[0]) {
                         setFileToUpload(e.target.files[0]);
                       }
                     }} 
                     style={{ display: "none" }}
                   />
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                 </label>
               )}

               <input 
                 type="text" 
                 placeholder={activeTab === "nova-ai" ? "Prompt NOVA AI with your idea..." : `Message #${activeTab}`}
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

      {/* 3. Right Sidebar - Members */}
      <div style={{ width: "240px", borderLeft: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
         <div style={{ padding: "20px 20px 10px 20px" }}>
            <h4 style={{ fontSize: "0.8rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>MEMBERS — {members.length}</h4>
         </div>
         
         <div style={{ padding: "10px", overflowY: "auto", flex: 1 }}>
            {members.map(member => (
              <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "6px", cursor: "pointer", transition: "background 0.2s" }} className="channel-btn" onMouseOver={e => e.currentTarget.style.background="var(--glass-hover)"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
                 <div style={{ position: "relative" }}>
                   <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--glass)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "bold" }}>
                     {member.name.charAt(0)}
                   </div>
                   <div 
                     className={`status-indicator ${member.online ? 'status-online' : 'status-offline'}`} 
                     style={{ position: "absolute", bottom: "-2px", right: "-2px", border: "2px solid rgba(0,0,0,0.8)" }}
                   />
                 </div>
                 <span style={{ fontSize: "0.9rem", color: member.online ? "white" : "#777", fontWeight: member.online ? "500" : "normal" }}>
                   {member.name} {member.name === currentUser && <span style={{fontSize: "0.75rem", color: "var(--primary-light)"}}>(You)</span>}
                 </span>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
