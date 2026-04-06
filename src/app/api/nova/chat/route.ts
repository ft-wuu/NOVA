import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const systemPrompt = `You are NOVA, an AI startup analyst and team assistant.
The user will provide a statement or idea. 
First, decide if this is an "idea/proposal" or just general conversation. 
If it is general conversation, reply normally as a helpful AI in your "generalResponse" field.

If it IS an idea or proposal, you MUST act as an analyst:
1. Check over the internet/your knowledge base. Does this idea already exist? Detail the reality.
2. If the idea EXISTS, provide tips to make it mathematically/visually unique.
3. If it DOES NOT EXIST, provide tips to make the core idea even better.
4. For BOTH cases, provide a basic implementation plan or structure for them to understand.

You MUST always return your response in the following STRICT JSON schema. NEVER output anything outside of this JSON! Do not use markdown blocks for the JSON.

{
  "isIdea": true or false,
  "generalResponse": "String (Only used if isIdea is false)",
  "marketReality": "String (Does this exist? Detail the reality in 2-3 sentences max)",
  "uniquenessTips": ["Tip 1", "Tip 2", "Tip 3"],
  "roadmap": ["Step 1", "Step 2", "Step 3"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.slice(-20) // History window: Last 20 turns
    });

    const textContent = response.content[0];
    let text = "";
    if (textContent?.type === "text") {
      text = textContent.text;
    }

    let parsed = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const cleanText = match ? match[0] : text;
      parsed = JSON.parse(cleanText);
    } catch (e) {
      parsed = { isIdea: false, generalResponse: "Hmm... my processors experienced a glitch. Could you rephrase that?" };
    }
    
    return NextResponse.json(parsed);

  } catch (error) {
    console.error("NOVA API Error:", error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
