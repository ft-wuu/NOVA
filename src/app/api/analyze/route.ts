import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(`Here is the idea: "${prompt}"`);
    const text = result.response.text();

    let parsedData = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      const cleanText = match ? match[0] : text;
      parsedData = JSON.parse(cleanText);
    } catch(e) {
      console.error("Failed to parse Gemini output:", text);
      parsedData = {
        exists: "Could not perfectly structure the AI response.",
        uniquenessTips: "Please try again.",
        basicStructure: text
      };
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze idea via Gemini' }, { status: 500 });
  }
}
