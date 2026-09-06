import React from "react";
import { Link } from "react-router-dom";
import { CategoryIcon } from "./CategoryIcon";

// Large 160x200 category card for the horizontal carousel.
export default function CategoryCard({ category, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative shrink-0 w-40 h-[200px] rounded-3xl overflow-hidden text-left active:scale-[0.97] transition-transform"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient}`} />
      <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 70% 15%, rgba(255,255,255,0.5), transparent 65%)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute top-3 left-3 flex items-center justify-center w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md text-white">
        <CategoryIcon name={category.icon} size={20} />
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white text-[16px] font-bold leading-tight tracking-tight">{category.name}</p>
        <p className="text-white/70 text-[11px] font-semibold mt-0.5">{category.count} episodes</p>
      </div>
    </button>
  );
}