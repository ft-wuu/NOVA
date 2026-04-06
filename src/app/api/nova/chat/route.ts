import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are NOVA, an AI startup analyst. 
If the user asks a general question, output this JSON:
{ "isIdea": false, "response": "your reply" }

If the user proposes an idea, output this JSON:
{ "isIdea": true, "marketReality": "brief reality", "uniquenessTips": ["tip1", "tip2", "tip3"], "roadmap": ["step1", "step2", "step3"] }

STRICT RULE: Return ONLY the JSON object. Do not include markdown blocks, backticks, or any other text.`;

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in Vercel environment variables.' }, { status: 500 });
    }

    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    // Old-school payload format (v1 compatible)
    const body = {
      contents: [
        {
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUSER MESSAGE: ${lastMessage}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini Error ${res.status}: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed: any = {};
    try {
      // Find the first { and last } to extract JSON even if model adds talk
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      const jsonStr = (firstBrace !== -1 && lastBrace !== -1) 
        ? rawText.substring(firstBrace, lastBrace + 1) 
        : rawText;
      
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { isIdea: false, response: rawText || "I couldn't process that. Try again!" };
    }

    parsed.generalResponse = parsed.generalResponse || parsed.response || parsed.message || "Hey there!";
    return NextResponse.json(parsed);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'API crashed.' }, { status: 500 });
  }
}
