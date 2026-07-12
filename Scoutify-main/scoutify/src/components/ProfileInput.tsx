"use client";

import React, { useState } from "react";
import type { ScoutifyInputData } from "@/types";
import { calculateHeightInches } from "@/utils/evaluation";

interface ProfileInputProps {
  onSubmit: (data: ScoutifyInputData) => void;
}

export default function ProfileInput({ onSubmit }: ProfileInputProps) {
  const [feet, setFeet] = useState(6);
  const [inches, setInches] = useState(0);
  const [weight, setWeight] = useState("");
  const [position, setPosition] = useState("WR");
  const [fortyYardTime, setFortyYardTime] = useState("");
  const [vertical, setVertical] = useState("");
  const [benchPress, setBenchPress] = useState("");
  const [broadJump, setBroadJump] = useState("");
  const [threeConeTime, setThreeConeTime] = useState("");
  const [shuttleTime, setShuttleTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const heightInches = calculateHeightInches(feet, inches);

    const inputData: ScoutifyInputData = {
      position,
      heightInches,
      weight: parseFloat(weight) || 0,
      fortyYardTime: parseFloat(fortyYardTime) || 0,
      vertical: parseFloat(vertical) || 0,
      benchPress: parseFloat(benchPress) || 0,
      broadJump: parseFloat(broadJump) || 0,
      threeConeTime: parseFloat(threeConeTime) || 0,
      shuttleTime: parseFloat(shuttleTime) || 0,
    };

    localStorage.setItem("scoutifyinputdata", JSON.stringify(inputData));
    onSubmit(inputData);
  };

  return (
    <section className="w-full bg-emerald-950 py-16 px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-white text-4xl font-bold mb-8 border-b-4 border-amber-500 pb-4">
          Create Your Profile, Get Results.
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Position */}
          <div>
            <label htmlFor="position" className="block text-white font-semibold mb-2">
              Position
            </label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            >
              <option value="WR">Wide Receiver</option>
              <option value="CB">Cornerback</option>
              <option value="QB">Quarterback</option>
              <option value="RB">Running Back</option>
              <option value="OL">Offensive Lineman</option>
            </select>
          </div>

          {/* Height */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="feet" className="block text-white font-semibold mb-2">
                Feet
              </label>
              <select
                id="feet"
                value={feet}
                onChange={(e) => setFeet(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
              >
                {[5, 6, 7].map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inches" className="block text-white font-semibold mb-2">
                Inches
              </label>
              <input
                id="inches"
                type="number"
                min="0"
                max="11"
                value={inches}
                onChange={(e) => setInches(parseInt(e.target.value) || 0)}
                placeholder="0-11"
                className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
              />
            </div>
          </div>

          {/* Weight */}
          <div>
            <label htmlFor="weight" className="block text-white font-semibold mb-2">
              Weight
            </label>
            <input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="pounds"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          {/* 40 Yard Time */}
          <div>
            <label htmlFor="fortyYardTime" className="block text-white font-semibold mb-2">
              40 Yard Time
            </label>
            <input
              id="fortyYardTime"
              type="number"
              step="0.01"
              value={fortyYardTime}
              onChange={(e) => setFortyYardTime(e.target.value)}
              placeholder="seconds"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          {/* Vertical */}
          <div>
            <label htmlFor="vertical" className="block text-white font-semibold mb-2">
              Vertical
            </label>
            <input
              id="vertical"
              type="number"
              step="0.1"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              placeholder="inches"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          {/* Bench Press */}
          <div>
            <label htmlFor="benchPress" className="block text-white font-semibold mb-2">
              Bench Press
            </label>
            <input
              id="benchPress"
              type="number"
              value={benchPress}
              onChange={(e) => setBenchPress(e.target.value)}
              placeholder="pounds"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          {/* Broad Jump */}
          <div>
            <label htmlFor="broadJump" className="block text-white font-semibold mb-2">
              Broad Jump
            </label>
            <input
              id="broadJump"
              type="number"
              step="0.1"
              value={broadJump}
              onChange={(e) => setBroadJump(e.target.value)}
              placeholder="inches"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          {/* 3 Cone Drill Time */}
          <div>
            <label htmlFor="threeConeTime" className="block text-white font-semibold mb-2">
              3 Cone Drill Time
            </label>
            <input
              id="threeConeTime"
              type="number"
              step="0.01"
              value={threeConeTime}
              onChange={(e) => setThreeConeTime(e.target.value)}
              placeholder="seconds"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          {/* Shuttle Time */}
          <div>
            <label htmlFor="shuttleTime" className="block text-white font-semibold mb-2">
              Shuttle Time
            </label>
            <input
              id="shuttleTime"
              type="number"
              step="0.01"
              value={shuttleTime}
              onChange={(e) => setShuttleTime(e.target.value)}
              placeholder="seconds"
              className="w-full px-4 py-2 bg-emerald-900 text-white border border-emerald-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 text-white py-3 font-bold hover:bg-emerald-600"
          >
            Get Analytics
          </button>
        </form>
      </div>
    </section>
  );
}
