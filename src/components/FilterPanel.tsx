"use client";

import { useState, useEffect, useRef } from "react";

export interface Filters {
  name: string;
  set: string;
  supertype: string;
  types: string;
  rarity: string;
  hpMin: string;
  hpMax: string;
}

export const emptyFilters: Filters = {
  name: "",
  set: "",
  supertype: "",
  types: "",
  rarity: "",
  hpMin: "",
  hpMax: "",
};

interface SetInfo {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onSearch: () => void;
  loading: boolean;
}

const SUPERTYPES = ["Pokémon", "Trainer", "Energy"];
const ENERGY_TYPES = [
  "Colorless", "Darkness", "Dragon", "Fairy", "Fighting",
  "Fire", "Grass", "Lightning", "Metal", "Psychic", "Water",
];
const RARITIES = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Rare Holo EX",
  "Rare Holo GX", "Rare Holo V", "Rare VMAX", "Rare VSTAR",
  "Rare Ultra", "Rare Rainbow", "Rare Secret", "Rare Shiny",
  "Amazing Rare", "Promo",
];

export default function FilterPanel({ filters, onChange, onSearch, loading }: FilterPanelProps) {
  const [sets, setSets] = useState<SetInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pokemonNames, setPokemonNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/sets")
      .then((res) => res.json())
      .then(setSets)
      .catch(() => {});
    fetch("/api/pokemon-names")
      .then((res) => res.json())
      .then(setPokemonNames)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function handleClear() {
    onChange(emptyFilters);
  }

  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  // Group sets by series
  const setsBySeries: Record<string, SetInfo[]> = {};
  for (const s of sets) {
    if (!setsBySeries[s.series]) setsBySeries[s.series] = [];
    setsBySeries[s.series].push(s);
  }

  return (
    <div className="w-full">
      {/* Toggle button for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sm:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white mb-2 cursor-pointer"
      >
        <span className="text-sm font-medium">
          Filters {activeCount > 0 && `(${activeCount})`}
        </span>
        <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Filter content */}
      <div className={`${isOpen ? "block" : "hidden"} sm:block`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          {/* Pokemon Name */}
          <div ref={nameRef} className="relative">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={filters.name}
              onChange={(e) => {
                const val = e.target.value;
                update("name", val);
                setSelectedIndex(-1);
                if (val.length >= 1 && pokemonNames.length > 0) {
                  const matches = pokemonNames
                    .filter((n) => n.toLowerCase().startsWith(val.toLowerCase()))
                    .slice(0, 8);
                  setSuggestions(matches);
                  setShowSuggestions(matches.length > 0);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) => Math.max(prev - 1, -1));
                } else if (e.key === "Enter") {
                  if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    update("name", suggestions[selectedIndex]);
                    setShowSuggestions(false);
                  }
                  onSearch();
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0 && filters.name.length >= 1) setShowSuggestions(true);
              }}
              placeholder="e.g. Charizard"
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e63946] transition"
            />
            {showSuggestions && (
              <div className="absolute z-50 w-full mt-1 rounded-lg bg-[#1a1a2e] border border-white/10 shadow-xl overflow-hidden">
                {suggestions.map((name, i) => (
                  <div
                    key={name}
                    onClick={() => {
                      update("name", name);
                      setShowSuggestions(false);
                    }}
                    className={`px-3 py-2 cursor-pointer text-sm transition ${
                      i === selectedIndex
                        ? "bg-[#e63946] text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Set */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Set</label>
            <select
              value={filters.set}
              onChange={(e) => update("set", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e63946] transition cursor-pointer"
            >
              <option value="" className="bg-[#1a1a2e]">All Sets</option>
              {Object.entries(setsBySeries).map(([series, seriesSets]) => (
                <optgroup key={series} label={series} className="bg-[#1a1a2e]">
                  {seriesSets.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#1a1a2e]">
                      {s.name} ({s.releaseDate?.slice(0, 4)})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Supertype */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Card Type</label>
            <select
              value={filters.supertype}
              onChange={(e) => update("supertype", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e63946] transition cursor-pointer"
            >
              <option value="" className="bg-[#1a1a2e]">All Types</option>
              {SUPERTYPES.map((t) => (
                <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>
              ))}
            </select>
          </div>

          {/* Energy Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Energy</label>
            <select
              value={filters.types}
              onChange={(e) => update("types", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e63946] transition cursor-pointer"
            >
              <option value="" className="bg-[#1a1a2e]">All Energy</option>
              {ENERGY_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>
              ))}
            </select>
          </div>

          {/* Rarity */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rarity</label>
            <select
              value={filters.rarity}
              onChange={(e) => update("rarity", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e63946] transition cursor-pointer"
            >
              <option value="" className="bg-[#1a1a2e]">All Rarities</option>
              {RARITIES.map((r) => (
                <option key={r} value={r} className="bg-[#1a1a2e]">{r}</option>
              ))}
            </select>
          </div>

          {/* HP Range */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">HP Range</label>
            <div className="flex gap-1">
              <input
                type="number"
                value={filters.hpMin}
                onChange={(e) => update("hpMin", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                placeholder="Min"
                className="w-full px-2 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e63946] transition"
              />
              <input
                type="number"
                value={filters.hpMax}
                onChange={(e) => update("hpMax", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                placeholder="Max"
                className="w-full px-2 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e63946] transition"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onSearch}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-[#e63946] hover:bg-[#ff6b6b] disabled:opacity-50 text-white text-sm font-semibold transition cursor-pointer"
            >
              {loading ? "..." : "Search"}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 text-sm transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
