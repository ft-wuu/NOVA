"use client";

import { auth, googleProvider, githubProvider, appleProvider, db } from "@/lib/firebase";
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleProviderLogin = async (provider: any) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Sync user to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "New Visionary",
        email: user.email,
        lastLogin: serverTimestamp(),
      }, { merge: true });

      localStorage.setItem("nova_user", user.displayName || user.email?.split('@')[0] || "User");
      router.push("/lobby");
    } catch (err: any) {
      if(err.code !== "auth/operation-not-supported-in-this-environment") {
         setError(err.message);
      } else {
         localStorage.setItem("nova_user", "Demo User");
         router.push("/lobby");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!displayName) throw new Error("Display Name is required.");
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName });
        
        await setDoc(doc(db, "users", res.user.uid), {
          name: displayName,
          email: email,
          createdAt: serverTimestamp(),
        });

        localStorage.setItem("nova_user", displayName);
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem("nova_user", res.user.displayName || email.split('@')[0]);
      }
      router.push("/lobby");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--background)", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", transition: "background 0.5s ease" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "20px", textAlign: "center", animation: "fadeInScale 0.5s ease-out forwards" }}>
        
        <h2 style={{ fontSize: "2.2rem", color: "white", fontWeight: "800", margin: 0, letterSpacing: "-1px" }}>
          {isRegistering ? "Create Account" : "Access NOVA.AI"}
        </h2>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
          {isRegistering ? "Join the intelligence frontier." : "Refine your ideas. Connect with your team."}
        </p>

        {error && <div style={{ color: "white", fontSize: "0.85rem", padding: "12px", background: "rgba(255, 77, 77, 0.2)", borderRadius: "10px", border: "1px solid rgba(255, 77, 77, 0.3)" }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
           <button onClick={() => handleProviderLogin(googleProvider)} className="nova-button secondary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }} disabled={isLoading}>
             <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width={20} alt="Google" />
             Google
           </button>
           <div style={{ display: "flex", gap: "10px" }}>
             <button onClick={() => handleProviderLogin(githubProvider)} className="nova-button secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }} disabled={isLoading}>
               <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width={20} style={{ filter: "var(--icon-filter)" }} alt="Github" />
               GitHub
             </button>
             <button onClick={() => handleProviderLogin(appleProvider)} className="nova-button secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }} disabled={isLoading}>
               <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width={20} style={{ filter: "var(--icon-filter)" }} alt="Apple" />
               Apple
             </button>
           </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
          <span style={{ padding: "0 15px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold" }}>OR SECURE IDENTITY</span>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
        </div>

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {isRegistering && (
            <input 
              type="text" 
              placeholder="Full Name" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="nova-button" style={{ width: "100%", marginTop: "10px" }} disabled={isLoading}>
            {isLoading ? "Authenticating..." : (isRegistering ? "Initialize Account" : "Access Console")}
          </button>
        </form>

        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span style={{ opacity: 0.7 }}>{isRegistering ? "Back to HQ?" : "New to the intelligence?"}</span>
          <span 
            onClick={() => setIsRegistering(!isRegistering)} 
            style={{ 
              color: "var(--primary-light)", 
              cursor: "pointer", 
              textDecoration: "none", 
              fontWeight: "700", 
              display: "flex", 
              alignItems: "center", 
              gap: "5px",
              padding: "4px 10px",
              background: "rgba(157, 78, 221, 0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(157, 78, 221, 0.2)",
              transition: "all 0.3s ease"
            }}
            className="auth-toggle-btn"
          >
            {isRegistering ? "← Log In" : "Create Account 🚀"}
          </span>
        </p>

        <style jsx>{`
          .auth-toggle-btn:hover {
            background: rgba(157, 78, 221, 0.2);
            transform: translateX(${isRegistering ? '-3px' : '3px'});
            border-color: var(--primary-light);
            box-shadow: 0 0 15px rgba(157, 78, 221, 0.3);
          }
        `}</style>

        <Link href="/" style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "20px", textDecoration: "none", opacity: 0.6, transition: "opacity 0.2s", fontWeight: "500" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}>
          ← Exit Secure Session
        </Link>
      </div>
    </main>
  );
}

