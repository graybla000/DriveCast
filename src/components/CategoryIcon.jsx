import React from "react";
import {
  Landmark, Atom, Rocket, Briefcase, Trees, Compass, Gem, Cog, Factory, Drill,
  Trophy, BrainCircuit, Hammer, Baby, HandHeart,
  ChefHat, Wrench, ListChecks, AppWindow, Code2, Zap,
  Headphones, MapPin, TreePine, Building2, GraduationCap,
} from "lucide-react";

// Category `icon` names in contentData.js must appear here — an unmapped name
// falls back to Compass silently rather than failing.
const CATEGORY_ICONS = {
  Landmark, Atom, Rocket, Briefcase, Trees, Compass, Gem, Cog, Factory, Drill,
  Trophy, BrainCircuit, Hammer, Baby, HandHeart,
  ChefHat, Wrench, ListChecks, AppWindow, Code2, Zap,
};

const TYPE_ICONS = {
  podcast: Headphones,
  lesson: GraduationCap,
  attraction: MapPin,
  trail: TreePine,
  museum: Building2,
};

export function CategoryIcon({ name, size = 22, className }) {
  const Icon = CATEGORY_ICONS[name] || Compass;
  return <Icon size={size} className={className} strokeWidth={2.2} />;
}

export function TypeIcon({ type, size = 18, className }) {
  const Icon = TYPE_ICONS[type] || MapPin;
  return <Icon size={size} className={className} strokeWidth={2.2} />;
}