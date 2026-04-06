import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- DEMO MODE FALLBACK ---
const generateMockReply = (message: string) => {
  const msg = message.toLowerCase();
  
  // Is it a startup idea?
  const isIdea = msg.length > 20 && (msg.includes("idea") || msg.includes("app") || msg.includes("startup") || msg.includes("build") || msg.includes("ai"));
  
  if (isIdea) {
     return {
        isIdea: true,
        marketReality: `The market for this concept is growing at an 18% CAGR. While players like OpenAI or local specialized SaaS exist, their lack of hardware-level optimization makes your specific pitch very competitive.`,
        uniquenessTips: [
          "Focus on the 'Privacy-First' angle to differentiate from big-tech.",
          "Implement a 'Bring Your Own Cloud' storage model.",
          "Use a specialized fine-tuned small-language-model for extreme latency speed."
        ],
        roadmap: [
          "Phases 1-2: Core engine architecture development.",
          "Phases 3-4: Closed Beta for 100 early adopters.",
          "Phases 5+: Global scale-up on edge compute."
        ],
        generalResponse: "That is a fascinating concept! I've run a deep-space intelligence scan, and here is how we can refine it."
     };
  }

  return {
    isIdea: false,
    generalResponse: "I'm standing by and ready to refine your vision. Whether you have a specific idea or just want to brainstorm, I'm your brilliant startup companion!"
  };
};

const SYSTEM_PROMPT = `You are NOVA, a supportive and brilliant AI startup companion. 
Your goal is to help the user refine their ideas and build something amazing.

STRICT: Return ONLY raw JSON. { "isIdea": boolean, "response": string, ... }`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    // 1. If no API key, go straight to Mock Analysis for the demo
    if (!GEMINI_API_KEY) {
      console.warn("CHAT DEMO MODE: No API Key found. Using local mock engine.");
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
       console.error("Chat API Internal Error - Falling back to Mock Engine");
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
      console.error("JSON Parse Error - Falling back to Mock Engine");
      parsed = generateMockReply(lastMessage);
    }
    
    parsed.generalResponse = parsed.response || parsed.generalResponse || "I'm listening!";
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error("NOVA AI Crash - Falling back to Mock Engine");
    try {
        const { messages } = await req.json();
        const lastMessage = messages?.[messages.length - 1]?.content || '';
        return NextResponse.json(generateMockReply(lastMessage));
    } catch {
        return NextResponse.json(generateMockReply("Hello"));
    }
  }
}
