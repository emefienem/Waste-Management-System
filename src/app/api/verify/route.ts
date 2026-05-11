import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiAPIKey = process.env.GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(geminiAPIKey);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert in waste management. Analyze this image and return JSON:
        {
          "wasteType": "type",
          "quantity": "amount in kg or L (0 if none)",
          "confidence": 0.0 to 1.0
        }

        Definition of waste:
        - Waste is ONLY an item that is clearly discarded, defective, broken, damaged, spoiled, decayed, or visibly unusable.
        - An object that is still functional, intact, new, or useful must NOT be classified as waste.

        Rules:
        - "quantity" must ALWAYS be a number or range (e.g., "5", "10-20", "≈15"), never "unknown".
        - If the waste is present but hard to estimate exactly, return a reasonable approximate range (e.g., "20-50 kg").
        - If the object is not clearly waste, return:
          "wasteType": "none", "quantity": "0", "confidence": below 0.5.
        - Do NOT classify intact electronics, food, or items that look new as waste.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      },
    ]);

    const text = result.response.text();

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
