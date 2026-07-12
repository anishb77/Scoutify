"use client";

export default function Hero() {
  return (
    <section className="relative w-full h-screen bg-cover bg-center flex items-center justify-start overflow-hidden"
      style={{
        backgroundImage: "url(/hero.jpg)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent opacity-70" />

      <div className="relative z-10 max-w-2xl ml-16 text-left">
        <h1 className="text-white text-5xl font-bold mb-4 border-4 border-amber-500 inline-block px-6 py-3">
          Free Analytics For All.
        </h1>

        <h2 className="text-white text-2xl font-light mb-6">
          An NFL Prospect App that ANYONE can use.
        </h2>

        <p className="text-white text-lg mb-12 max-w-xl">
          Enter your combine numbers, and Scoutify's model measures your profile against a database of NFL players to find your strengths, weaknesses, and similar builds.
        </p>

        <div className="text-white text-sm font-light opacity-80">
          Scroll and Start Now!
        </div>
      </div>
    </section>
  );
}
