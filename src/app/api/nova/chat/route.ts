import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // Detect if the latest message is an idea
    const patterns = [
      /i'm (building|creating|making)/i,
      /my (idea|startup|app)/i,
      /what if (we|i|someone)/i,
      /problem statement/i,
      /(app|platform|tool) (that|which|to)/i,
      /solve the (problem)/i
    ];
    const isIdea = patterns.some(pattern => pattern.test(lastMessage));

    let systemPrompt = "You are NOVA, a general team assistant. Respond clearly and concisely.";
    if (isIdea) {
      systemPrompt = `You are NOVA, an AI startup idea analyst.
Analyze the user's idea and return STRICTLY JSON (no markdown blocks, no extra text) with the following structure:
{
  "type": "idea_existing" or "idea_fresh",
  "data": {
    "marketReality": "Competitors or existing solutions (max 2 sentences)",
    "differentiators": ["Tip 1", "Tip 2", "Tip 3"],
    "roadmap": ["Step 1", "Step 2", "Step 3"]
  }
}
Keep points bulleted and concise, max 12 words per bullet.`;
    }

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

    if (isIdea) {
      let parsed = {};
      try {
        const cleanText = text.replace(/^```json/m, '').replace(/^```/m, '').trim();
        parsed = JSON.parse(cleanText);
      } catch (e) {
        parsed = { type: 'general', content: text }; // Fallback
      }
      return NextResponse.json(parsed);
    } else {
      return NextResponse.json({ type: 'general', content: text });
    }

  } catch (error) {
    console.error("NOVA API Error:", error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
