import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Using the same v1beta + gemini-1.5-flash robust connection as the chat API
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY in Vercel environment variables.' }, { status: 500 });
    }

    const { prompt } = await req.json();

    const SYSTEM_PROMPT = `You are NOVA, an AI startup analyst. 
Analyze the provided idea and return ONLY a valid JSON object with these exact keys:
{"exists":"A short explanation of whether similar concepts exist.","uniquenessTips":"Tips on how to make this idea unique.","basicStructure":"A high-level technical structure or implementation steps."}`;

    const body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Idea: "${prompt}"` }]
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
       console.error("Gemini Error:", data);
       return NextResponse.json({ error: data.error?.message || 'Gemini API call failed' }, { status: res.status });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let parsedData: any;
    try {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      const cleanJson = (start !== -1 && end !== -1) ? rawText.slice(start, end + 1) : rawText;
      parsedData = JSON.parse(cleanJson.trim());
    } catch (e) {
      console.error("JSON Parse Error:", rawText);
      parsedData = {
        exists: "The AI was not able to perfectly structure its response. Re-try or re-phrase.",
        uniquenessTips: "Try again.",
        basicStructure: rawText
      };
    }

    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message || 'The AI assistant hit a server connection roadblock.' }, { status: 500 });
  }
}
