// Units that support decimal quantities (weight and volume based)
export const DECIMAL_UNITS = ["kg", "g", "l", "ml"] as const;

export type DecimalUnit = (typeof DECIMAL_UNITS)[number];

/**
 * Check if a unit supports decimal quantities
 * Weight units (kg, g) and volume units (l, ml) support decimals
 * Count-based units (pcs, box, etc.) use integers
 */
export function isDecimalUnit(unit: string): boolean {
  return DECIMAL_UNITS.includes(unit as DecimalUnit);
}

/**
 * Get a display-friendly label for a unit
 */
export function getUnitLabel(unit: string): string {
  const labels: Record<string, string> = {
    kg: "kg",
    g: "g",
    l: "L",
    ml: "ml",
    pcs: "pcs",
    box: "box",
    pack: "pack",
    set: "set",
    pair: "pair",
    dozen: "dz",
  };
  return labels[unit] || unit;
}
