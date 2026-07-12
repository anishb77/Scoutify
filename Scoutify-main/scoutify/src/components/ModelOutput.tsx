"use client";

import React, { Suspense } from "react";
import type { ScoutifyInputData, ScoutifyApiResponse } from "@/types";
import { getEvaluationTier } from "@/utils/evaluation";
import { analyzeMetrics } from "@/lib/apiClient";
import RadarChart from "./RadarChart";
import Skeleton from "./Skeleton";

interface ModelOutputProps {
  input: ScoutifyInputData;
}

async function ModelContent({ input }: ModelOutputProps) {
  const data = await analyzeMetrics(input);

  return (
    <section className="w-full bg-emerald-950 py-16 px-8">
      <div className="max-w-5xl mx-auto">
        {/* Grades Section */}
        <div className="mb-16">
          <h2 className="text-white text-4xl font-bold mb-2 border-b-4 border-amber-500 pb-4">
            Your Analytics.
          </h2>
          <p className="text-white text-lg mb-6">
            Here's Where You Stand with Your Stats.
          </p>
          <p className="text-white text-sm mb-8">
            Overall Grades for Relevant Attributes (Selected based on your position)
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.grades).map(([attribute, grade]) => (
              <div
                key={attribute}
                className="bg-emerald-900 p-6 rounded border border-emerald-700"
              >
                <h3 className="text-white font-bold mb-2">{attribute}</h3>
                <p className="text-amber-400 text-3xl font-bold mb-2">{grade}</p>
                <p className="text-emerald-300 text-sm">
                  {getEvaluationTier(grade)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart Section */}
        <div className="mb-16">
          <RadarChart
            userSpeed={data.radarData.user.speed}
            userExplosiveness={data.radarData.user.explosiveness}
            userPower={data.radarData.user.power}
            userAgility={data.radarData.user.agility}
            comparablePlayerName={data.radarData.comparablePlayer.name}
            comparablePlayerSpeed={data.radarData.comparablePlayer.speed}
            comparablePlayerExplosiveness={
              data.radarData.comparablePlayer.explosiveness
            }
            comparablePlayerPower={data.radarData.comparablePlayer.power}
            comparablePlayerAgility={data.radarData.comparablePlayer.agility}
          />
        </div>

        {/* Similar Players Section */}
        <div>
          <h2 className="text-white text-4xl font-bold mb-8 border-b-4 border-amber-500 pb-4">
            Players That Tested Like You and Made It.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.similarPlayers.map((player, idx) => (
              <div
                key={idx}
                className="bg-emerald-900 p-6 rounded border border-emerald-700"
              >
                <h3 className="text-white text-xl font-bold mb-4">
                  {player.name}
                </h3>
                <div className="space-y-2 mb-4 text-white">
                  <p>Height: {player.height}</p>
                  <p>Weight: {player.weight}</p>
                  <p>School: {player.school}</p>
                </div>
                <div className="space-y-1 text-white text-sm">
                  {Object.entries(player)
                    .filter(
                      ([key]) =>
                        !["name", "height", "weight", "school"].includes(key)
                    )
                    .map(([key, value]) => (
                      <p key={key}>
                        {key}: {value}
                      </p>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ModelOutput({ input }: ModelOutputProps) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ModelContent input={input} />
    </Suspense>
  );
}
