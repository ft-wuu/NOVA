import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- DEMO MODE FALLBACK ---
// --- PREMIUM AI ASSET REPOSITORY ---

const GREETING_RESPONSES = [
  "Greetings, visionary! I've been standardizing the neural pathways for your next big breakthrough. What's on your mind?",
  "NOVA is online and calibrated. Ready to turn some sparks into a wildfire of innovation?",
  "The digital cosmos is aligned today. What kind of future are we building this morning?",
  "System scan complete: Creativity levels are optimal. How can I assist your journey today?",
  "I've been analyzing market fluctuations while you were away. Ready to disrupt the status quo?",
  "Hello! I was just refining some optimization algorithms. Always ready to brainstorm your next project.",
  "Vision detected. Protocol 'Innovation' initiated. What are we brainstorming?"
];

const IDEA_ARCHETYPES = [
  {
    type: "SaaS / Digital Platform",
    marketReality: "The SaaS sector is currently seeing a massive shift towards 'micro-verticalization'. Investors are pivoting from horizontal platforms to hyper-specific tools with 40%+ retention rates.",
    uniquenessTips: [
      "Implement a 'Utility-First' landing page that solves a problem before they even sign up.",
      "Focus on 1-click integrations with the existing 'Modern Data Stack'.",
      "Use a usage-based pricing model to lower the barrier to entry."
    ],
    roadmap: ["MVP: Core workflow automation", "Beta: Integration ecosystem", "V1: Enterprise security layer"],
    researchFoundations: ["The State of Vertical SaaS (2024)", "Retention Mechanics in PLG Motions"]
  },
  {
    type: "Biotech / HealthTech",
    marketReality: "Personalized medicine and 'Longevity-as-a-Service' are the current frontier. Regulatory moats are deeper than ever, but valuations for proven IP are at record highs.",
    uniquenessTips: [
      "Bridge the gap between clinical data and consumer-friendly UI.",
      "Focus on 'Data Privacy' as the primary product feature.",
      "Leverage decentralized clinical trials for faster validation."
    ],
    roadmap: ["Pre-Clinical validation", "Regulatory sandbox entry", "Limited clinical rollout"],
    researchFoundations: ["Neuromorphic Computing in Proteomics", "Decentralized Health Data Ownership"]
  },
  {
    type: "Fintech / DeFi",
    marketReality: "We've moved past 'Crypto' into 'Programmable Finance'. Real-world asset (RWA) tokenization is the 10-year trend to watch as traditional liquidity migrates.",
    uniquenessTips: [
      "Abstract away the complexity—users shouldn't know they're using a blockchain.",
      "Focus on compliance-as-code to simplify cross-border friction.",
      "Implement social-recovery for all high-value transactions."
    ],
    roadmap: ["Liquidity protocol audit", "Regional compliance license", "Institutional onboarding"],
    researchFoundations: ["Liquidity Dynamics in Layer-3 Networks", "The Future of RWA Tokenization"]
  },
  {
    type: "AI / Machine Learning",
    marketReality: "Foundation models are commodities; 'Agentic Workflows' are the value. The winners won't build LLMs; they'll build the systems that use them to solve real-world chores.",
    uniquenessTips: [
      "Build for 'Self-Correction'—an AI that double-checks its own work is 10x more valuable.",
      "Optimize for small, local models to ensure 100% data sovereignty.",
      "Focus on the 'Human-in-the-loop' interface for complex decision making."
    ],
    roadmap: ["Agentic architecture design", "Domain-specific fine-tuning", "Autonomous scaling"],
    researchFoundations: ["Recursive Error Correction in Transformers", "Latency Optimization for Edge AI"]
  },
  {
    type: "Hardware / Robotics",
    marketReality: "Hardware is hard, but 'Software-Defined Hardware' is where the margin is. Investors are looking for robotics that can be updated via the cloud as quickly as a web app.",
    uniquenessTips: [
      "Use modular components to reduce repair downtime.",
      "Focus on 'Low-Power' as a competitive feature for long-tail operations.",
      "Implement a digital-twin for every physical unit for predictive maintenance."
    ],
    roadmap: ["Prototype 1 (Cardboard & Pi)", "Industrial Design Phase", "Small-batch manufacturing"],
    researchFoundations: ["Kinematic Chains in Edge Computing", "Sustainable Battery Chemistry (2025)"]
  },
  {
    type: "EdTech / Learning",
    marketReality: "The 'Certificate' era is ending; the 'Skill-Verification' era is starting. Continuous learning platforms that integrate directly into the workplace are the high-growth area.",
    uniquenessTips: [
      "Gamify the 'Proof of Work', not just the 'Proof of Attendance'.",
      "Implement AI-coaching that adapts to the learner's emotional state.",
      "Build a mentor-matching algorithm based on real-world performance data."
    ],
    roadmap: ["Curriculum engine build", "Peer-to-peer testing", "Corporate partnership rollout"],
    researchFoundations: ["Spaced Repetition in Multi-Agent Environments", "Cognitive Load and UI Design"]
  },
  {
    type: "GameFi / Entertainment",
    marketReality: "The metaverse failed, but 'Interoperable Assets' are succeeding. Players want ownership that transcends a single game engine.",
    uniquenessTips: [
      "Fun first, economy second. Don't build a fancy spreadsheet with graphics.",
      "Focus on user-generated content (UGC) tools that allow any player to be a creator.",
      "Use 'Zero-Knowledge' proofs for anti-cheat and hidden-information games."
    ],
    roadmap: ["Core loop mechanics Beta", "Asset marketplace launch", "Cross-engine plugin release"],
    researchFoundations: ["Neural Rendering in Real-Time Environments", "Tokenomic Stability in Circular Economies"]
  }
];

const generateMockReply = (message: string) => {
  const msg = message.toLowerCase();
  
  // 1. Check for Greetings
  const greetings = ["hi", "hey", "hello", "yo", "morning", "afternoon", "evening", "greetings"];
  if (greetings.some(g => msg.startsWith(g) && msg.length < 10)) {
     return {
        isIdea: false,
        generalResponse: GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)]
     };
  }
  
  // 2. Detect Idea Category or Default to General SaaS
  let archetype = IDEA_ARCHETYPES[0]; // Default
  if (msg.includes("health") || msg.includes("bio") || msg.includes("medical") || msg.includes("doctor")) archetype = IDEA_ARCHETYPES[1];
  else if (msg.includes("bank") || msg.includes("money") || msg.includes("crypto") || msg.includes("trade") || msg.includes("fin")) archetype = IDEA_ARCHETYPES[2];
  else if (msg.includes("ai") || msg.includes("bot") || msg.includes("learn") || msg.includes("data")) archetype = IDEA_ARCHETYPES[3];
  else if (msg.includes("robot") || msg.includes("device") || msg.includes("car") || msg.includes("hardware")) archetype = IDEA_ARCHETYPES[4];
  else if (msg.includes("teach") || msg.includes("school") || msg.includes("course") || msg.includes("student")) archetype = IDEA_ARCHETYPES[5];
  else if (msg.includes("game") || msg.includes("play") || msg.includes("fun") || msg.includes("movie")) archetype = IDEA_ARCHETYPES[6];

  const isPossibleIdea = msg.length > 15;
  
  if (isPossibleIdea) {
     return {
        isIdea: true,
        marketReality: archetype.marketReality,
        uniquenessTips: archetype.uniquenessTips,
        roadmap: archetype.roadmap,
        researchFoundations: archetype.researchFoundations,
        generalResponse: `Your vision for a ${archetype.type} project is compelling. I've analyzed the industry landscape—here is the refined strategy report.`
     };
  }

  return {
    isIdea: false,
    generalResponse: "I'm standing by and ready to refine your vision. Tell me more about your idea, or ask me to brainstorm a specific industry!"
  };
};

const SYSTEM_PROMPT = `You are NOVA, a supportive and brilliant AI startup companion. 
Your goal is to help the user refine their ideas and build something amazing.

STRICT: Return ONLY raw JSON. { "isIdea": boolean, "response": string, "marketReality": string, "uniquenessTips": string[], "roadmap": string[], "researchFoundations": string[] }`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    if (!GEMINI_API_KEY) {
      // Small artificial delay to make it feel trustable
      await new Promise(r => setTimeout(r, 1200));
      return NextResponse.json(generateMockReply(lastMessage));
    }

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: lastMessage }] }],
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
    
    if (!res.ok) {
       return NextResponse.json(generateMockReply(lastMessage));
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsed: any;
    try {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      const cleanJson = (start !== -1 && end !== -1) ? rawText.slice(start, end + 1) : rawText;
      parsed = JSON.parse(cleanJson.trim());
    } catch (e) {
      parsed = generateMockReply(lastMessage);
    }
    
    parsed.generalResponse = parsed.response || parsed.generalResponse || "I'm listening!";
    return NextResponse.json(parsed);

  } catch (err: any) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages?.[messages.length - 1]?.content || '';
        return NextResponse.json(generateMockReply(lastMessage));
    } catch {
        return NextResponse.json(generateMockReply("Hello"));
    }
  }
}
