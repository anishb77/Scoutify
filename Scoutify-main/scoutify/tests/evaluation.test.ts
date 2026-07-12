import { describe, it, expect } from "@jest/globals";
import { getEvaluationTier, calculateHeightInches } from "@/utils/evaluation";

describe("Evaluation Tier Calculator", () => {
  it("returns 'Very Above Average' for scores >= 85", () => {
    expect(getEvaluationTier(85)).toBe("Very Above Average");
    expect(getEvaluationTier(95)).toBe("Very Above Average");
  });

  it("returns 'Above Average' for scores 70-84", () => {
    expect(getEvaluationTier(70)).toBe("Above Average");
    expect(getEvaluationTier(80)).toBe("Above Average");
  });

  it("returns 'On Average' for scores 50-69", () => {
    expect(getEvaluationTier(50)).toBe("On Average");
    expect(getEvaluationTier(65)).toBe("On Average");
  });

  it("returns 'Below Average' for scores 30-49", () => {
    expect(getEvaluationTier(30)).toBe("Below Average");
    expect(getEvaluationTier(40)).toBe("Below Average");
  });

  it("returns 'Very Below Average' for scores < 30", () => {
    expect(getEvaluationTier(0)).toBe("Very Below Average");
    expect(getEvaluationTier(25)).toBe("Very Below Average");
  });
});

describe("Height Unification", () => {
  it("calculates heightInches correctly from feet and inches", () => {
    expect(calculateHeightInches(6, 0)).toBe(72);
    expect(calculateHeightInches(6, 2)).toBe(74);
    expect(calculateHeightInches(5, 11)).toBe(71);
  });
});
