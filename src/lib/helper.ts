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

export function getDateFilter(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "year":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
}
