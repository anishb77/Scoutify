import type { ScoutifyInputData, ScoutifyApiResponse } from "@/types";
import { fetchMockResults } from "./mockApi";

export async function analyzeMetrics(
  input: ScoutifyInputData
): Promise<ScoutifyApiResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_SCOUTIFY_API;

  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API call failed:", error);
      return fetchMockResults(input);
    }
  }

  return fetchMockResults(input);
}
