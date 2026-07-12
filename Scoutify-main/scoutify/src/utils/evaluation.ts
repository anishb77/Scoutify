export type EvaluationTier =
  | "Very Above Average"
  | "Above Average"
  | "On Average"
  | "Below Average"
  | "Very Below Average";

export function getEvaluationTier(score: number): EvaluationTier {
  if (score >= 85) return "Very Above Average";
  if (score >= 70) return "Above Average";
  if (score >= 50) return "On Average";
  if (score >= 30) return "Below Average";
  return "Very Below Average";
}

export function calculateHeightInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}
