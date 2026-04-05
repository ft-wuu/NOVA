"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ServerWorkspace() {
  const { id } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [starredIdeas, setStarredIdeas] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("chat"); // chat or starred
  const [isBotTyping, setIsBotTyping] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "You",
      type: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Detect if calling bot (e.g., idea prompt or @NOVA)
    if (userMessage.content.toLowerCase().includes("idea") || userMessage.content.toLowerCase().includes("@nova")) {
       triggerBotAnalysis(userMessage.content);
    }
  };

  const triggerBotAnalysis = async (prompt: string) => {
    setIsBotTyping(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await response.json();
      
      const botReport = {
        id: Date.now() + 1,
        sender: "NOVA Bot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: data.exists || "An error occurred fetching data.",
        uniquenessTips: data.uniquenessTips || "No unique tips returned.",
        basicStructure: data.basicStructure || "No structure returned.",
        starred: false
      };
      
      setMessages((prev) => [...prev, botReport]);
    } catch (error) {
      console.error("Error analyzing idea:", error);
      const errorReport = {
        id: Date.now() + 1,
        sender: "NOVA Bot",
        type: "bot_report",
        ideaPrompt: prompt,
        exists: "Network Error.",
        uniquenessTips: "Could not connect to the API.",
        basicStructure: "Please check your logs.",
        starred: false
      };
      setMessages((prev) => [...prev, errorReport]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const toggleStar = (messageId: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const isNowStarred = !msg.starred;
        if (isNowStarred && !starredIdeas.find(i => i.id === messageId)) {
          setStarredIdeas([...starredIdeas, { ...msg, starred: true }]);
        } else if (!isNowStarred) {
          setStarredIdeas(starredIdeas.filter(i => i.id !== messageId));
        }
        return { ...msg, starred: !msg.starred };
      }
      return msg;
    }));
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)" }}>
      {/* Sidebar */}
      <div style={{ width: "250px", borderRight: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--glass-border)" }}>
           <h3 style={{ color: "var(--primary-light)", letterSpacing: "1px" }}>Workspace</h3>
           <p style={{ fontSize: "0.8rem", color: "#888" }}>Code: {id}</p>
        </div>

        <div style={{ padding: "20px", flex: 1 }}>
           <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "10px", textTransform: "uppercase" }}>Channels</p>
           <button 
             onClick={() => setActiveTab("chat")}
             style={{ background: activeTab === "chat" ? "var(--glass)" : "transparent", color: "white", border: "none", width: "100%", textAlign: "left", padding: "10px", borderRadius: "8px", cursor: "pointer", marginBottom: "5px" }}
           >
             # general-chat
           </button>
           <button 
             onClick={() => setActiveTab("starred")}
             style={{ background: activeTab === "starred" ? "var(--glass)" : "transparent", color: "white", border: "none", width: "100%", textAlign: "left", padding: "10px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
           >
             ⭐ Starred Ideas
             {starredIdeas.length > 0 && <span style={{ background: "var(--primary)", borderRadius: "10px", padding: "2px 6px", fontSize: "0.7rem", color: "white" }}>{starredIdeas.length}</span>}
           </button>
        </div>

        <div style={{ padding: "20px", borderTop: "1px solid var(--glass-border)" }}>
           <Link href="/lobby">
              <button className="nova-button secondary" style={{ width: "100%", fontSize: "0.9rem", padding: "8px" }}>Leave Server</button>
           </Link>
        </div>
      </div>

      {/* Main Content View */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Header */}
        <div style={{ height: "65px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", padding: "0 20px", background: "rgba(0,0,0,0.3)" }}>
           {activeTab === "chat" ? (
             <h3># general-chat</h3>
           ) : (
             <h3>⭐ Starred Ideas Refinement</h3>
           )}
        </div>

        {/* Chat Area */}
        {activeTab === "chat" && (
          <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
             {messages.length === 0 && (
               <div style={{ margin: "auto", color: "#666", textAlign: "center" }}>
                  <img src="https://www.svgrepo.com/show/532362/sparkles.svg" width={40} style={{ filter: "invert(0.5) sepia(1) hue-rotate(240deg) saturate(3)"}} alt="sparkles"/>
                  <p style={{ marginTop: "10px" }}>Start the conversation. Share an idea or mention @NOVA to analyze.</p>
               </div>
             )}

             {messages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", gap: "15px", animation: "fadeInUp 0.3s ease-out forwards" }}>
                   <div style={{ width: "40px", height: "40px", borderRadius: "20px", background: msg.type === "bot_report" ? "var(--primary)" : "var(--glass)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>
                      {msg.sender.charAt(0)}
                   </div>
                   
                   <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: "bold", fontSize: "0.9rem", color: msg.type === "bot_report" ? "var(--primary-light)" : "white", marginBottom: "5px" }}>
                        {msg.sender}
                      </p>

                      {msg.type === "user" && <p style={{ color: "#ddd" }}>{msg.content}</p>}

                      {msg.type === "bot_report" && (
                         <div className="glass-panel" style={{ padding: "20px", position: "relative", marginTop: "10px", border: "1px solid var(--primary-light)" }}>
                            <div style={{ position: "absolute", top: "15px", right: "15px", display: "flex", gap: "10px" }}>
                               <button 
                                 onClick={() => toggleStar(msg.id)}
                                 style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", filter: msg.starred ? "grayscale(0)" : "grayscale(1)" }}
                               >⭐</button>
                               <button style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", color: "white", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem", transition: "0.2s background" }} onMouseOver={e => e.currentTarget.style.background="var(--glass-hover)"} onMouseOut={e => e.currentTarget.style.background="var(--glass)"}>✍ Modify</button>
                            </div>

                            <p style={{ fontStyle: "italic", color: "#aaa", marginBottom: "15px", paddingBottom:"10px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Analysis for: "{msg.ideaPrompt}"</p>
                            
                            <h4 style={{ color: "var(--accent)" }}>Does this exist?</h4>
                            <p style={{ color: "#ddd", marginBottom: "15px", fontSize: "0.95rem" }}>{msg.exists}</p>

                            <h4 style={{ color: "var(--accent)" }}>How to make it unique</h4>
                            <p style={{ color: "#ddd", marginBottom: "15px", fontSize: "0.95rem" }}>{msg.uniquenessTips}</p>

                            <h4 style={{ color: "var(--accent)" }}>Basic Structure / Knowledge</h4>
                            <p style={{ color: "#ddd", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>{msg.basicStructure}</p>
                         </div>
                      )}
                   </div>
                </div>
             ))}

             {isBotTyping && (
                <div style={{ display: "flex", gap: "15px", animation: "fadeInUp 0.3s" }}>
                   <div style={{ width: "40px", height: "40px", borderRadius: "20px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>N</div>
                   <div style={{ color: "var(--primary-light)", fontSize: "0.9rem", display: "flex", alignItems: "center", fontStyle: "italic" }}>
                     NOVA Bot is analyzing market data...
                   </div>
                </div>
             )}
             <div ref={endOfMessagesRef} />
          </div>
        )}

        {/* Input Area */}
        {activeTab === "chat" && (
           <div style={{ padding: "20px", background: "rgba(0,0,0,0.5)", borderTop: "1px solid var(--glass-border)" }}>
             <div style={{ display: "flex", gap: "10px" }}>
               <input 
                 type="text" 
                 placeholder="Message #general-chat (mention @NOVA or 'idea' for AI analysis)" 
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                 style={{ padding: "15px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}
               />
               <button onClick={handleSendMessage} className="nova-button" style={{ padding: "0 30px" }}>Send</button>
             </div>
           </div>
        )}

        {/* Starred Ideas Area */}
        {activeTab === "starred" && (
           <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
              {starredIdeas.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", marginTop: "50px" }}>No starred ideas yet. Star an AI report in the chat to save it here.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {starredIdeas.map(idea => (
                     <div key={idea.id} className="glass-panel" style={{ borderLeft: "4px solid #ffca28" }}>
                        <h3 style={{ marginBottom: "15px", color: "var(--primary-light)" }}>Analysis: "{idea.ideaPrompt}"</h3>
                        <p style={{ color: "#ddd", marginBottom: "10px", fontSize: "0.95rem" }}><strong style={{color:"var(--accent)"}}>Unique Angles:</strong><br/>{idea.uniquenessTips}</p>
                        <p style={{ color: "#ddd", whiteSpace: "pre-wrap", fontSize: "0.95rem" }}><strong style={{color:"var(--accent)"}}>Structure:</strong><br/>{idea.basicStructure}</p>
                     </div>
                  ))}
                </div>
              )}
           </div>
        )}

      </div>
    </div>
  );
}
