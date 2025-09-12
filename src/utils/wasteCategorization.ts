export function categorizeWaste(wasteType: string): number {
  const wasteTypeLower = wasteType.toLowerCase();

  // Organic waste
  if (
    wasteTypeLower.includes("food") ||
    wasteTypeLower.includes("organic") ||
    wasteTypeLower.includes("compost") ||
    wasteTypeLower.includes("vegetable") ||
    wasteTypeLower.includes("fruit") ||
    wasteTypeLower.includes("garden")
  ) {
    return 1; // Organic category ID
  }

  // Plastic waste
  if (
    wasteTypeLower.includes("plastic") ||
    wasteTypeLower.includes("bottle") ||
    wasteTypeLower.includes("packaging") ||
    wasteTypeLower.includes("container")
  ) {
    return 2; // Plastic category ID
  }

  // E-waste
  if (
    wasteTypeLower.includes("electronic") ||
    wasteTypeLower.includes("e-waste") ||
    wasteTypeLower.includes("battery") ||
    wasteTypeLower.includes("device") ||
    wasteTypeLower.includes("computer") ||
    wasteTypeLower.includes("phone")
  ) {
    return 3; // E-waste category ID
  }

  // Paper waste
  if (
    wasteTypeLower.includes("paper") ||
    wasteTypeLower.includes("cardboard") ||
    wasteTypeLower.includes("newspaper") ||
    wasteTypeLower.includes("magazine")
  ) {
    return 4; // Paper category ID
  }

  // Glass waste
  if (
    wasteTypeLower.includes("glass") ||
    (wasteTypeLower.includes("bottle") && !wasteTypeLower.includes("plastic"))
  ) {
    return 5; // Glass category ID
  }

  // Default to mixed waste
  return 6; // Mixed waste category ID
}
