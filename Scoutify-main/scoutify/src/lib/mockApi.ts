import type { ScoutifyInputData, ScoutifyApiResponse } from "@/types";

export function fetchMockResults(input: ScoutifyInputData): ScoutifyApiResponse {
  const grades: Record<string, number> = {};

  if (input.position === "WR" || input.position === "CB") {
    grades["40 Yard Time"] = 75;
    grades["Vertical"] = 78;
    grades["Broad Jump"] = 72;
    grades["Shuttle Time"] = 80;
    grades["3 Cone Drill"] = 76;
  } else {
    grades["40 Yard Time"] = 65;
    grades["Vertical"] = 68;
    grades["Broad Jump"] = 70;
    grades["Shuttle Time"] = 72;
    grades["3 Cone Drill"] = 68;
  }

  const comparablePlayerName = input.position === "WR" ? "Sample WR" : "Sample DB";

  return {
    grades,
    radarData: {
      user: {
        speed: 75,
        explosiveness: 78,
        power: 70,
        agility: 80,
      },
      comparablePlayer: {
        name: comparablePlayerName,
        speed: 78,
        explosiveness: 82,
        power: 75,
        agility: 79,
      },
    },
    similarPlayers: [
      {
        name: comparablePlayerName,
        height: "6-1",
        weight: "195",
        school: "Sample University",
        speed: 78,
        explosiveness: 82,
        power: 75,
        agility: 79,
      },
      {
        name: "Another Player",
        height: "6-0",
        weight: "190",
        school: "Another University",
        speed: 76,
        explosiveness: 80,
        power: 73,
        agility: 78,
      },
    ],
  };
}
