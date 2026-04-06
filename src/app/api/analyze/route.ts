import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '', // Make sure to set this in .env.local
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const systemPrompt = `You are NOVA, an AI assistant analyzing user ideas.
Please analyze the following idea and provide structured feedback.

Return your response strictly as a JSON object with the exact following keys. Do not include markdown blocks or any other text outside the JSON.
{
  "exists": "A short explanation of whether similar concepts exist.",
  "uniquenessTips": "Tips on how to make this idea unique.",
  "basicStructure": "A high-level technical structure or knowledge implementation steps."
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Here is the idea: "${prompt}"` }
      ]
    });

    // Extract text content from Claude's response
    const textContent = response.content?.[0];
    let text = "{}";
    if (textContent?.type === "text") {
      text = textContent.text;
    }
    
    let parsedData = {};
    try {
        // Strip markdown code block framing if it exists
        const cleanText = text.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
        parsedData = JSON.parse(cleanText);
    } catch(e) {
        console.error("Failed to parse Claude output:", text);
        parsedData = {
           exists: "Could not perfectly structure the AI response perfectly.",
           uniquenessTips: "Please try again.",
           basicStructure: text
        };
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Claude API Error:", error);
    return NextResponse.json({ error: 'Failed to analyze idea via Claude' }, { status: 500 });
  }
}
