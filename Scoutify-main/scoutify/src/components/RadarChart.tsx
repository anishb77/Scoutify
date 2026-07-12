"use client";

interface RadarChartProps {
  userSpeed: number;
  userExplosiveness: number;
  userPower: number;
  userAgility: number;
  comparablePlayerName: string;
  comparablePlayerSpeed: number;
  comparablePlayerExplosiveness: number;
  comparablePlayerPower: number;
  comparablePlayerAgility: number;
}

export default function RadarChart({
  userSpeed,
  userExplosiveness,
  userPower,
  userAgility,
  comparablePlayerName,
  comparablePlayerSpeed,
  comparablePlayerExplosiveness,
  comparablePlayerPower,
  comparablePlayerAgility,
}: RadarChartProps) {
  const maxValue = 100;
  const scale = 80;

  const centerX = 100;
  const centerY = 100;

  const getUserPoint = (value: number, angle: number) => {
    const radius = (value / maxValue) * scale;
    const rad = (angle * Math.PI) / 180;
    return [centerX + radius * Math.cos(rad), centerY + radius * Math.sin(rad)];
  };

  const getComparablePoint = (value: number, angle: number) => {
    const radius = (value / maxValue) * scale;
    const rad = (angle * Math.PI) / 180;
    return [centerX + radius * Math.cos(rad), centerY + radius * Math.sin(rad)];
  };

  const speedAngle = 0;
  const explosAngle = 90;
  const powerAngle = 180;
  const agilityAngle = 270;

  const userSpeedPoint = getUserPoint(userSpeed, speedAngle);
  const userExplosPoint = getUserPoint(userExplosiveness, explosAngle);
  const userPowerPoint = getUserPoint(userPower, powerAngle);
  const userAgilityPoint = getUserPoint(userAgility, agilityAngle);

  const compSpeedPoint = getComparablePoint(
    comparablePlayerSpeed,
    speedAngle
  );
  const compExplosPoint = getComparablePoint(
    comparablePlayerExplosiveness,
    explosAngle
  );
  const compPowerPoint = getComparablePoint(comparablePlayerPower, powerAngle);
  const compAgilityPoint = getComparablePoint(
    comparablePlayerAgility,
    agilityAngle
  );

  const userPolygon = [
    userSpeedPoint,
    userExplosPoint,
    userPowerPoint,
    userAgilityPoint,
  ]
    .map((p) => p.join(","))
    .join(" ");

  const compPolygon = [
    compSpeedPoint,
    compExplosPoint,
    compPowerPoint,
    compAgilityPoint,
  ]
    .map((p) => p.join(","))
    .join(" ");

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-white text-2xl font-bold mb-2">Your Skills.</h3>
      <p className="text-white text-sm mb-6">
        (Compared to "{comparablePlayerName}")
      </p>

      <svg width="240" height="240" className="mx-auto">
        {/* Grid lines for diamond */}
        <line x1={centerX} y1={centerY - scale} x2={centerX} y2={centerY + scale} stroke="#4b7c59" />
        <line x1={centerX - scale} y1={centerY} x2={centerX + scale} y2={centerY} stroke="#4b7c59" />

        {/* Diamond outline */}
        <polygon
          points={`${centerX},${centerY - scale} ${centerX + scale},${centerY} ${centerX},${centerY + scale} ${centerX - scale},${centerY}`}
          fill="none"
          stroke="#4b7c59"
          strokeWidth="1"
        />

        {/* User polygon (blue) */}
        <polygon points={userPolygon} fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" strokeWidth="2" />

        {/* Comparable player polygon (red) */}
        <polygon
          points={compPolygon}
          fill="#ef4444"
          fillOpacity="0.2"
          stroke="#ef4444"
          strokeWidth="2"
        />

        {/* Labels */}
        <text x={centerX} y={centerY - scale - 10} textAnchor="middle" fill="white" fontSize="12">
          Speed
        </text>
        <text x={centerX + scale + 10} y={centerY + 5} textAnchor="start" fill="white" fontSize="12">
          Explosiveness
        </text>
        <text x={centerX} y={centerY + scale + 20} textAnchor="middle" fill="white" fontSize="12">
          Power
        </text>
        <text x={centerX - scale - 10} y={centerY + 5} textAnchor="end" fill="white" fontSize="12">
          Agility
        </text>
      </svg>

      <div className="flex gap-8 justify-center mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500" />
          <span className="text-white">You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500" />
          <span className="text-white">{comparablePlayerName}</span>
        </div>
      </div>
    </div>
  );
}
