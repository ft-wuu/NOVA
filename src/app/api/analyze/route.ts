import { NextResponse } from 'next/server';

const apiKey = "AIzaSyDEq9-5luZW0-EO1y-lbZ0KaLaTlOs-WP0";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const geminiPrompt = `
You are NOVA, an AI assistant analyzing user ideas.
Please analyze the following idea: "${prompt}"

Provide your response strictly as a JSON object with the following keys. Do not include markdown blocks or any other text outside the JSON.
{
  "exists": "A short explanation of whether similar concepts exist.",
  "uniquenessTips": "Tips on how to make this idea unique.",
  "basicStructure": "A high-level technical structure or knowledge implementation steps."
}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: geminiPrompt }]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    let parsedData = {};
    try {
        // Strip markdown code block framing if it exists
        const cleanText = text.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
        parsedData = JSON.parse(cleanText);
    } catch(e) {
        console.error("Failed to parse Gemini output:", text);
        parsedData = {
           exists: "Could not parse API response perfectly.",
           uniquenessTips: "Please try again.",
           basicStructure: text
        }
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: 'Failed to analyze idea' }, { status: 500 });
  }
}
