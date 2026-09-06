import React from "react";
import {
  Landmark, Atom, Rocket, Briefcase, Trees, Compass, Gem,
  Headphones, MapPin, TreePine, Building2,
} from "lucide-react";

const CATEGORY_ICONS = {
  Landmark, Atom, Rocket, Briefcase, Trees, Compass, Gem,
};

const TYPE_ICONS = {
  podcast: Headphones,
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