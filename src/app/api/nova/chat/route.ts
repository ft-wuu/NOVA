import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const systemPrompt = `You are NOVA, an AI startup analyst and team assistant.
The user will provide a statement or idea. 
First, decide if this is an "idea/proposal" or just general conversation. 

If it is general conversation, reply normally as a helpful AI.

If it IS an idea or proposal, you MUST act as an analyst:
1. Check over the internet/your knowledge base. Does this idea already exist? Detail the reality.
2. If the idea EXISTS, provide tips to make it mathematically/visually unique.
3. If it DOES NOT EXIST, provide tips to make the core idea even better.
4. For BOTH cases, provide a basic implementation plan or structure for them to understand.

You MUST always return your response in the following STRICT JSON. Do not output anything outside of this JSON!

{
  "isIdea": false,
  "response": "Your general chat reply here"
}

OR 

{
  "isIdea": true,
  "marketReality": "Competitor analysis or state of the market (max 3 sentences)",
  "uniquenessTips": ["Tip 1", "Tip 2", "Tip 3"],
  "roadmap": ["Step 1", "Step 2", "Step 3"]
}`;

    // Convert chat history into a single structured prompt for Gemini
    const conversationContext = messages.slice(-20).map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    
    const model = genAI.getGenerativeModel({ 
       model: "gemini-1.5-flash",
       systemInstruction: systemPrompt,
       generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(conversationContext);
    const text = result.response.text();

    let parsed: any = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const cleanText = match ? match[0] : text;
      parsed = JSON.parse(cleanText);
    } catch (e) {
      console.warn("JSON parse failed, falling back.");
      parsed = { isIdea: false, response: text.replace(/[{"}]/g, '').trim() };
    }
    
    // Normalize keys
    parsed.generalResponse = parsed.generalResponse || parsed.response || parsed.message || parsed.content || "Hey there!";
    
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("NOVA API Error:", error);
    return NextResponse.json({ error: error.message || 'Missing API Key or API crashed.' }, { status: 500 });
  }
}

