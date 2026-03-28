"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import SearchBar from "@/components/SearchBar";
import SortSelect, { SortOption } from "@/components/SortSelect";
import CardGrid, { PokemonCard } from "@/components/CardGrid";

const RARITY_ORDER: Record<string, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  "Rare Holo": 3,
  "Rare Holo EX": 4,
  "Rare Holo GX": 5,
  "Rare Holo V": 6,
  "Rare Ultra": 7,
  "Rare Rainbow": 8,
  "Rare Secret": 9,
  "Rare Shiny": 10,
  "Rare Shining": 11,
  LEGEND: 12,
  "Amazing Rare": 13,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCard(card: any): PokemonCard {
  let priceVal = 0;
  const pricesDetail: Record<string, Record<string, number>> = {};

  if (card.tcgplayer?.prices) {
    for (const [variant, priceData] of Object.entries(card.tcgplayer.prices)) {
      pricesDetail[variant] = priceData as Record<string, number>;
      const market = (priceData as Record<string, number>).market;
      if (market && priceVal === 0) priceVal = market;
    }
  }

  return {
    name: card.name,
    set: card.set?.name || "Unknown",
    rarity: card.rarity || "Unknown",
    price: priceVal,
    imageSmall: card.images?.small || "",
    imageLarge: card.images?.large || "",
    artist: card.artist || "Unknown",
    number: card.number || "?",
    setTotal: card.set?.printedTotal?.toString() || "?",
    setSeries: card.set?.series || "Unknown",
    setRelease: card.set?.releaseDate || "Unknown",
    types: (card.types || []).join(", ") || "N/A",
    hp: card.hp || "N/A",
    supertype: card.supertype || "Unknown",
    subtypes: (card.subtypes || []).join(", ") || "N/A",
    pricesDetail,
    tcgplayerUrl: card.tcgplayer?.url || "",
  };
}

function sortCards(cards: PokemonCard[], sort: SortOption): PokemonCard[] {
  const sorted = [...cards];
  switch (sort) {
    case "price-high":
      return sorted.sort((a, b) => b.price - a.price);
    case "price-low":
      return sorted.sort(
        (a, b) => (a.price || 9999999) - (b.price || 9999999)
      );
    case "release-new":
      return sorted.sort((a, b) => b.setRelease.localeCompare(a.setRelease));
    case "release-old":
      return sorted.sort((a, b) => a.setRelease.localeCompare(b.setRelease));
    case "hp-high":
      return sorted.sort(
        (a, b) => (parseInt(b.hp) || 0) - (parseInt(a.hp) || 0)
      );
    case "hp-low":
      return sorted.sort(
        (a, b) => (parseInt(a.hp) || 9999) - (parseInt(b.hp) || 9999)
      );
    case "rarity":
      return sorted.sort(
        (a, b) =>
          (RARITY_ORDER[b.rarity] ?? -1) - (RARITY_ORDER[a.rarity] ?? -1)
      );
    case "name-az":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-za":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "number":
      return sorted.sort(
        (a, b) => (parseInt(a.number) || 9999) - (parseInt(b.number) || 9999)
      );
    default:
      return sorted;
  }
}

export default function Home() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<SortOption>("price-high");
  const [searchedName, setSearchedName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const currentSearchRef = useRef("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortedCards = useMemo(() => sortCards(cards, sort), [cards, sort]);

  const fetchCards = useCallback(
    async (name: string, page: number, append: boolean) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const nameParam = name ? `name=${encodeURIComponent(name)}&` : "";
        const res = await fetch(
          `/api/search?${nameParam}page=${page}&pageSize=100`
        );
        const data = await res.json();
        const parsed = (data.data || []).map(parseCard);
        const total = data.totalCount || 0;

        // Ignore if search changed while loading
        if (currentSearchRef.current !== name) return;

        setTotalCount(total);
        setCards((prev) => (append ? [...prev, ...parsed] : parsed));
        setCurrentPage(page);
        setHasMore(page * 100 < total);
      } catch {
        if (!append) setCards([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  async function handleSearch(name: string) {
    currentSearchRef.current = name;
    setHasSearched(true);
    setSearchedName(name || "All Cards");
    setCards([]);
    fetchCards(name, 1, false);
  }

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchCards(currentSearchRef.current, currentPage + 1, true);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [hasMore, loading, loadingMore, currentPage, fetchCards]);

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <h1 className="text-xl font-bold text-white whitespace-nowrap">
              <span className="text-[#e63946]">Pokemon</span> Card Lookup
            </h1>
            <SearchBar onSearch={handleSearch} loading={loading} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              <SortSelect value={sort} onChange={setSort} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {!hasSearched && (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
            <div className="text-6xl mb-6">&#9733;</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Search for a Pokemon
            </h2>
            <p className="text-gray-500 max-w-md mb-6">
              Type a Pokemon name to browse every card ever printed, with
              current market prices from TCGPlayer.
            </p>
            <button
              onClick={() => handleSearch("")}
              className="px-6 py-3 rounded-xl bg-[#e63946] hover:bg-[#ff6b6b] text-white font-semibold transition cursor-pointer"
            >
              Browse All Cards
            </button>
          </div>
        )}

        {hasSearched && !loading && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="text-white font-semibold">{cards.length}</span>{" "}
              of{" "}
              <span className="text-white font-semibold">
                {totalCount.toLocaleString()}
              </span>{" "}
              cards
              {searchedName !== "All Cards" && (
                <>
                  {" "}
                  for{" "}
                  <span className="text-white font-semibold">
                    &ldquo;{searchedName}&rdquo;
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#e63946] rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Searching cards...</p>
          </div>
        )}

        {hasSearched && !loading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-gray-500">
              No cards found. Try a different name.
            </p>
          </div>
        )}

        {!loading && sortedCards.length > 0 && (
          <CardGrid cards={sortedCards} />
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {loadingMore && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-white/20 border-t-[#e63946] rounded-full animate-spin mr-3" />
            <p className="text-gray-500">Loading more cards...</p>
          </div>
        )}
      </div>
    </main>
  );
}
