import React from "react";
import { Sparkles, Dices } from "lucide-react";

// Wild Card "Surprise Me" generator block — high-contrast with animated gradient ring.
export default function SurpriseMeCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-3xl p-5 overflow-hidden text-left active:scale-[0.98] transition-transform"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-800" />
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gold/30 blur-2xl" />
      <div className="absolute inset-0 rounded-3xl ring-1 ring-white/15" />
      <div className="relative flex items-center gap-4">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md text-white shrink-0">
          <span className="absolute inset-0 rounded-2xl ring-2 ring-white/40 animate-pulse" />
          <Dices size={30} strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-gold text-[11px] font-bold uppercase tracking-wider">
            <Sparkles size={12} /> Wild Card
          </div>
          <p className="text-white text-[20px] font-extrabold tracking-tight leading-tight mt-0.5">Surprise Me</p>
          <p className="text-white/70 text-[12px] font-medium mt-0.5">A random local gem, trail, or episode</p>
        </div>
      </div>
    </button>
  );
}