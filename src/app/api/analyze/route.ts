import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in Vercel environment variables.' }, { status: 500 });
    }

    const { prompt } = await req.json();

    const SYSTEM_PROMPT = `You are NOVA, an AI startup idea analyst.
Analyze the user's idea and return ONLY a valid JSON object with these exact keys:
{"exists":"brief reality check","uniquenessTips":"tips to stand out","basicStructure":"3 implementation steps"}

RULE: No markdown, no backticks, no comments. Return ONLY the JSON object.`;

    const body = {
      contents: [
        {
          parts: [{ text: `${SYSTEM_PROMPT}\n\nIDEA PROMPT: ${prompt}` }]
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

    let parsedData: any = {};
    try {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      const jsonStr = (firstBrace !== -1 && lastBrace !== -1) 
        ? rawText.substring(firstBrace, lastBrace + 1) 
        : rawText;
      
      parsedData = JSON.parse(jsonStr);
    } catch {
      parsedData = {
        exists: "Error parsing AI response.",
        uniquenessTips: "Try again.",
        basicStructure: rawText
      };
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to analyze idea' }, { status: 500 });
  }
}
