import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Using v1beta and gemini-1.5-flash for maximum intelligence and modern feature support (JSON mode)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are NOVA, a supportive and brilliant AI startup companion. 
Your goal is to help the user refine their ideas and build something amazing.

If the user is just chatting or saying hi:
- Be friendly, witty, and helpful.
- Return JSON: { "isIdea": false, "response": "Your friendly reply here" }

If the user shares a startup idea, business plan, or app concept:
- Act as an elite consultant.
- Detail the market reality (is this already out there?).
- Provide 3 "Killer Edge" tips to make it 10x more unique.
- Provide a "Zero-to-One" implementation roadmap.
- Return JSON: { "isIdea": true, "marketReality": "...", "uniquenessTips": ["...", "...", "..."], "roadmap": ["...", "...", "..."] }

STRICT: Return ONLY raw JSON. No markdown blocks.`;

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
       return NextResponse.json({ error: 'Missing GEMINI_API_KEY in Vercel environment variables.' }, { status: 500 });
    }

    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    const body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: lastMessage }]
        }
      ],
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
       console.error("Gemini API Error Detail:", data);
       return NextResponse.json({ error: data.error?.message || 'Gemini API call failed' }, { status: res.status });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsed: any;
    try {
      // Find JSON block just in case
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      const cleanJson = (start !== -1 && end !== -1) ? rawText.slice(start, end + 1) : rawText;
      parsed = JSON.parse(cleanJson.trim());
    } catch (e) {
      console.error("JSON Parse Error:", rawText);
      parsed = { isIdea: false, response: rawText || "My neural links experienced a slight tremor. Could you rephrase that?" };
    }
    
    // Ensure UI-compatible keys
    parsed.generalResponse = parsed.response || parsed.generalResponse || "I'm listening!";
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error("NOVA AI Crash:", err);
    return NextResponse.json({ error: 'Global AI connector crashed. Please verify your GEMINI_API_KEY.' }, { status: 500 });
  }
}
