import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const systemPrompt = `You are NOVA, an AI assistant analyzing user ideas.
Analyze this idea and return ONLY a valid JSON object with these exact keys:
{"exists":"A short explanation of whether similar concepts exist.","uniquenessTips":"Tips on how to make this idea unique.","basicStructure":"A high-level technical structure or implementation steps."}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nIdea: "${prompt}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
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
      const match = rawText.match(/\{[\s\S]*\}/);
      parsedData = JSON.parse(match ? match[0] : rawText);
    } catch {
      parsedData = {
        exists: "Could not structure the AI response.",
        uniquenessTips: "Please try again.",
        basicStructure: rawText
      };
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze idea' }, { status: 500 });
  }
}
