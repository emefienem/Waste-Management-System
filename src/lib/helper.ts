export function parseGeminiJson(rawText: string) {
  try {
    // help me strip markdown code block formatting
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    // to try direct parse
    return JSON.parse(cleaned);
  } catch {
    // Fallback: extract first {...} block
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
