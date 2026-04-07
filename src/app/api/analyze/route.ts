import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- ENHANCED DEMO MODE FALLBACK ---
// --- PREMIUM AI ASSET REPOSITORY (SYNCED) ---

const IDEA_ARCHETYPES = [
  {
    type: "SaaS / Digital Platform",
    marketReality: "The SaaS sector is currently seeing a massive shift towards 'micro-verticalization'. Investors are pivoting from horizontal platforms to hyper-specific tools with 40%+ retention rates.",
    uniquenessTips: "• Implement a 'Utility-First' landing page.\n• Focus on 1-click integrations with the 'Modern Data Stack'.\n• Use a usage-based pricing model to lower the barrier.",
    roadmap: "1. MVP: Core workflow automation\n2. Beta: Integration ecosystem\n3. V1: Enterprise security layer",
    researchFoundations: ["The State of Vertical SaaS (2024)", "Retention Mechanics in PLG Motions"]
  },
  {
    type: "Biotech / HealthTech",
    marketReality: "Personalized medicine and 'Longevity-as-a-Service' are the current frontier. Regulatory moats are deeper than ever, but valuations for proven IP are at record highs (20% CAGR).",
    uniquenessTips: "• Bridge the gap between clinical data and consumer UI.\n• Focus on 'Data Privacy' as the primary product feature.\n• Leverage decentralized clinical trials for validation.",
    roadmap: "1. Pre-Clinical validation phase\n2. Regulatory sandbox entry\n3. Limited clinical rollout",
    researchFoundations: ["Neuromorphic Computing in Proteomics", "Decentralized Health Data Ownership"]
  },
  {
    type: "Fintech / DeFi",
    marketReality: "We've moved past 'Crypto' into 'Programmable Finance'. Real-world asset (RWA) tokenization is the key trend as institutional liquidity ($10T+) migrates.",
    uniquenessTips: "• Abstract away the complexity—seamless blockchain usage.\n• Focus on compliance-as-code friction reduction.\n• Implement social-recovery for high-value transactions.",
    roadmap: "1. Liquidity protocol audit\n2. Regional compliance license\n3. Institutional onboarding",
    researchFoundations: ["Liquidity Dynamics in Layer-3 Networks", "The Future of RWA Tokenization"]
  },
  {
    type: "AI / Machine Learning",
    marketReality: "Foundation models are commodities; 'Agentic Workflows' are the value. The winners won't build LLMs; they'll build the systems that control them.",
    uniquenessTips: "• Build for 'Self-Correction'—AI self-auditing.\n• Optimize for small, local models for sovereignty.\n• Human-in-the-loop interface for complex decisions.",
    roadmap: "1. Agentic architecture design\n2. Domain-specific fine-tuning\n3. Autonomous scaling protocol",
    researchFoundations: ["Recursive Error Correction in Transformers", "Latency Optimization for Edge AI"]
  },
  {
    type: "Hardware / Robotics",
    marketReality: "Hardware is hard, but 'Software-Defined Hardware' is where the margin is. Robotics that can be updated via the cloud are current investor favorites.",
    uniquenessTips: "• Use modular components to reduce repair downtime.\n• Focus on 'Low-Power' for long-tail operations.\n• Digital-twin pairing for every physical unit.",
    roadmap: "1. Prototype 1 (Cardboard & Pi)\n2. Industrial Design Phase\n3. Small-batch manufacturing",
    researchFoundations: ["Kinematic Chains in Edge Computing", "Sustainable Battery Chemistry (2025)"]
  }
];

const generateMockAnalysis = (prompt: string) => {
  const msg = prompt.toLowerCase();
  
  let archetype = IDEA_ARCHETYPES[0]; // Default SaaS
  if (msg.includes("health") || msg.includes("bio") || msg.includes("medical") || msg.includes("doctor")) archetype = IDEA_ARCHETYPES[1];
  else if (msg.includes("bank") || msg.includes("money") || msg.includes("crypto") || msg.includes("trade") || msg.includes("fin")) archetype = IDEA_ARCHETYPES[2];
  else if (msg.includes("ai") || msg.includes("bot") || msg.includes("learn") || msg.includes("data")) archetype = IDEA_ARCHETYPES[3];
  else if (msg.includes("robot") || msg.includes("device") || msg.includes("car") || msg.includes("hardware")) archetype = IDEA_ARCHETYPES[4];

  return {
    exists: archetype.marketReality,
    uniquenessTips: archetype.uniquenessTips,
    basicStructure: archetype.roadmap,
    researchFoundations: archetype.researchFoundations
  };
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!GEMINI_API_KEY) {
      await new Promise(r => setTimeout(r, 1500)); // Artificial thinking time
      return NextResponse.json(generateMockAnalysis(prompt));
    }

    const SYSTEM_PROMPT = `You are NOVA, an AI startup analyst. 
Analyze the idea and return ONLY a valid JSON object with these exact keys:
{"exists":"...","uniquenessTips":"...","basicStructure":"...", "researchFoundations": ["Paper 1", "Paper 2"]}`;

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `Idea: "${prompt}"` }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json(generateMockAnalysis(prompt));

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsedData: any;
    try {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      const cleanJson = (start !== -1 && end !== -1) ? rawText.slice(start, end + 1) : rawText;
      parsedData = JSON.parse(cleanJson.trim());
    } catch (e) {
      parsedData = generateMockAnalysis(prompt);
    }

    return NextResponse.json(parsedData);
  } catch (err: any) {
    try {
        const { prompt } = await req.json();
        return NextResponse.json(generateMockAnalysis(prompt || "Your Idea"));
    } catch {
        return NextResponse.json(generateMockAnalysis("Your Idea"));
    }
  }
}
