"use client";

import { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (name: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/pokemon-names")
      .then((res) => res.json())
      .then(setAllNames)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.length >= 1 && allNames.length > 0) {
      const matches = allNames
        .filter((n) => n.toLowerCase().startsWith(value.toLowerCase()))
        .slice(0, 8);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function handleSelect(name: string) {
    setQuery(name);
    setShowSuggestions(false);
    onSearch(name);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else if (query.trim()) {
        setShowSuggestions(false);
        onSearch(query.trim());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Search Pokemon..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#e63946] focus:ring-1 focus:ring-[#e63946] transition"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (query.trim()) {
              setShowSuggestions(false);
              onSearch(query.trim());
            }
          }}
          disabled={loading || !query.trim()}
          className="px-6 py-3 rounded-xl bg-[#e63946] hover:bg-[#ff6b6b] disabled:opacity-50 disabled:hover:bg-[#e63946] text-white font-semibold transition cursor-pointer"
        >
          Search
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl overflow-hidden">
          {suggestions.map((name, i) => (
            <div
              key={name}
              onClick={() => handleSelect(name)}
              className={`px-4 py-2.5 cursor-pointer text-sm transition ${
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
  );
}
