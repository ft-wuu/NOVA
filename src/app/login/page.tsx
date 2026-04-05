"use client";

import { auth, googleProvider, githubProvider, appleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleProviderLogin = async (provider: any) => {
    try {
      await signInWithPopup(auth, provider);
      router.push("/lobby");
    } catch (err: any) {
      if(err.code !== "auth/operation-not-supported-in-this-environment") {
         setError(err.message);
      } else {
         // Because Firebase keys aren't real yet, mock it:
         router.push("/lobby");
      }
    }
  };

  const handleEmailLogin = () => {
    // Mocking email login redirect for demonstration
    router.push("/lobby");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "20px", textAlign: "center", animation: "fadeInUp 0.5s ease-out forwards" }}>
        
        <h2 style={{ fontSize: "2rem", color: "var(--primary-light)", fontWeight: "bold", margin: 0 }}>Join NOVA.AI</h2>
        <p style={{ color: "#aaa", margin: 0 }}>Refine your ideas. Connect with your team.</p>

        {error && <div style={{ color: "#ff4d4d", fontSize: "0.9rem", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "8px" }}>{error}</div>}

        <button 
          onClick={() => handleProviderLogin(googleProvider)} 
          className="nova-button secondary" 
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "10px" }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" width={24} height={24} alt="Google" />
          Continue with Google
        </button>

        <button 
          onClick={() => handleProviderLogin(githubProvider)} 
          className="nova-button secondary" 
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
        >
          <img src="https://www.svgrepo.com/show/475654/github.svg" width={24} height={24} style={{ filter: "invert(1)" }} alt="GitHub" />
          Continue with GitHub
        </button>

        <button 
          onClick={() => handleProviderLogin(appleProvider)} 
          className="nova-button secondary" 
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
        >
          <img src="https://www.svgrepo.com/show/511330/apple-173.svg" width={24} height={24} style={{ filter: "invert(1)" }} alt="Apple" />
          Continue with Apple
        </button>

        <div style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
          <span style={{ padding: "0 10px", color: "#666", fontSize: "0.9rem" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
        </div>

        <input type="email" placeholder="Email Address" />
        <button onClick={handleEmailLogin} className="nova-button" style={{ width: "100%" }}>Continue with Email</button>

        <p style={{ fontSize: "0.9rem", color: "#888", marginTop: "10px" }}>
          Don't have an account? <span style={{ color: "var(--primary-light)", cursor: "pointer", textDecoration: "underline" }}>Sign up</span>
        </p>

        <Link href="/" style={{ color: "#888", fontSize: "0.8rem", marginTop: "15px", display: "inline-block", alignSelf: "center" }}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
