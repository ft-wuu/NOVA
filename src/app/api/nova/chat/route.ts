import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are NOVA, an AI startup analyst. 
Return ONLY a JSON object. If the user asks a general question, output 
{ "isIdea": false, "response": "your reply" }. 
If the user proposes an idea, output 
{ "isIdea": true, "marketReality": "...", "uniquenessTips": ["...","...","..."], "roadmap": ["...","...","..."] }.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    const body = {
      systemInstruction: {
        role: "system",
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: lastMessage }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        stopSequences: ["\n"]
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini REST Error:", errText);
      return NextResponse.json({ error: `Gemini API Error ${res.status}: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed: any = {};
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : rawText);
    } catch {
      parsed = { isIdea: false, response: rawText || "I couldn't process that. Try again!" };
    }

    parsed.generalResponse = parsed.generalResponse || parsed.response || parsed.message || "Hey there!";
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("NOVA API Error:", error);
    return NextResponse.json({ error: error.message || 'API crashed.' }, { status: 500 });
  }
}
