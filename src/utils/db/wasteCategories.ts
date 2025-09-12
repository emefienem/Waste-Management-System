import { eq } from "drizzle-orm";
import { db } from "./dbConfig";
import { WasteCategories } from "./schema";

export async function initializeWasteCategories() {
  const categories = [
    {
      name: "Organic",
      description: "Biodegradable waste such as food scraps, garden waste",
      processingMethod: "Composted",
      fertilizerEstimate: "1kg fertilizer per 5kg waste",
    },
    {
      name: "Plastic",
      description: "Plastic containers, packaging, bottles",
      processingMethod: "Recycled",
      recoveryRate: 70, // 70% recovery rate
    },
    {
      name: "E-waste",
      description: "Electronic devices and components",
      processingMethod: "Recovered",
      recoveryRate: 85, // 85% recovery rate
    },
    {
      name: "Paper",
      description: "Paper products, cardboard",
      processingMethod: "Recycled",
      recoveryRate: 80, // 80% recovery rate
    },
    {
      name: "Glass",
      description: "Glass bottles, containers",
      processingMethod: "Recycled",
      recoveryRate: 90, // 90% recovery rate
    },
    {
      name: "Mixed Waste",
      description: "Non-separable mixed waste materials",
      processingMethod: "Disposed (Landfill)",
      recoveryRate: 5, // Minimal recovery
    },
  ];

  for (const category of categories) {
    const existing = await db
      .select()
      .from(WasteCategories)
      .where(eq(WasteCategories.name, category.name))
      .execute();

    if (existing.length === 0) {
      await db.insert(WasteCategories).values(category).execute();
    }
  }
}
