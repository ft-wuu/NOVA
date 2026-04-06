import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are NOVA, an AI startup analyst and team assistant.
The user will provide a statement or idea. 
First, decide if this is an "idea/proposal" or just general conversation. 

If it is general conversation, reply normally as a helpful AI.

If it IS an idea or proposal, act as an analyst:
1. Does this idea already exist? Detail the reality based on your knowledge.
2. If the idea EXISTS, provide 3 tips to make it unique and stand out.
3. If it DOES NOT EXIST, provide 3 tips to make the idea even better.
4. For BOTH cases, provide a 3-step basic roadmap or plan.

You MUST return ONLY a valid JSON object matching one of these two formats:

For general conversation:
{"isIdea":false,"response":"your reply here"}

For ideas:
{"isIdea":true,"marketReality":"market analysis here","uniquenessTips":["tip1","tip2","tip3"],"roadmap":["step1","step2","step3"]}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages?.[messages.length - 1]?.content || '';

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser message: ${lastMessage}` }]
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
