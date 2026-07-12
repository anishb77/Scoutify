"use client";

export default function Skeleton() {
  return (
    <div className="w-full bg-emerald-950 py-16 px-8 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-10 bg-emerald-900 rounded w-1/3" />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-emerald-900 h-32 rounded" />
            ))}
        </div>

        <div className="h-64 bg-emerald-900 rounded" />

        <div className="space-y-4">
          <div className="h-8 bg-emerald-900 rounded w-1/2" />
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-24 bg-emerald-900 rounded" />
            ))}
        </div>

        <p className="text-white text-center">Loading analytics</p>
      </div>
    </div>
  );
}
