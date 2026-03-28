"use client";

export type SortOption =
  | "price-high"
  | "price-low"
  | "release-new"
  | "release-old"
  | "hp-high"
  | "hp-low"
  | "rarity"
  | "name-az"
  | "name-za"
  | "number";

const sortLabels: Record<SortOption, string> = {
  "price-high": "Price (High)",
  "price-low": "Price (Low)",
  "release-new": "Newest",
  "release-old": "Oldest",
  "hp-high": "HP (High)",
  "hp-low": "HP (Low)",
  rarity: "Rarity",
  "name-az": "Name A-Z",
  "name-za": "Name Z-A",
  number: "Card #",
};

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export default function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e63946] transition cursor-pointer"
    >
      {Object.entries(sortLabels).map(([key, label]) => (
        <option key={key} value={key} className="bg-[#1a1a2e]">
          {label}
        </option>
      ))}
    </select>
  );
}
