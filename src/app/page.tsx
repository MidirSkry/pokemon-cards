"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import FilterPanel, { Filters, emptyFilters } from "@/components/FilterPanel";
import SortSelect, { type SortOption } from "@/components/SortSelect";
import CardGrid, { PokemonCard } from "@/components/CardGrid";

// Sorts that the API can't handle — must be done client-side
const CLIENT_SORTS = new Set<SortOption>(["price-high", "price-low", "rarity"]);

const RARITY_ORDER: Record<string, number> = {
  Common: 0, Uncommon: 1, Rare: 2, "Rare Holo": 3,
  "Rare Holo EX": 4, "Rare Holo GX": 5, "Rare Holo V": 6,
  "Rare Ultra": 7, "Rare Rainbow": 8, "Rare Secret": 9,
  "Rare Shiny": 10, "Rare Shining": 11, LEGEND: 12, "Amazing Rare": 13,
};

function clientSort(cards: PokemonCard[], sort: SortOption): PokemonCard[] {
  if (!CLIENT_SORTS.has(sort)) return cards;
  const sorted = [...cards];
  switch (sort) {
    case "price-high":
      return sorted.sort((a, b) => {
        if (!a.price && !b.price) return 0;
        if (!a.price) return 1;
        if (!b.price) return -1;
        return b.price - a.price;
      });
    case "price-low":
      return sorted.sort((a, b) => {
        if (!a.price && !b.price) return 0;
        if (!a.price) return 1;
        if (!b.price) return -1;
        return a.price - b.price;
      });
    case "rarity":
      return sorted.sort((a, b) => (RARITY_ORDER[b.rarity] ?? -1) - (RARITY_ORDER[a.rarity] ?? -1));
    default:
      return sorted;
  }
}

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

function buildSearchParams(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.set) params.set("set", filters.set);
  if (filters.supertype) params.set("supertype", filters.supertype);
  if (filters.types) params.set("types", filters.types);
  if (filters.rarity) params.set("rarity", filters.rarity);
  if (filters.hpMin) params.set("hpMin", filters.hpMin);
  if (filters.hpMax) params.set("hpMax", filters.hpMax);
  return params.toString();
}

export default function Home() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<SortOption>("release-new");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const searchIdRef = useRef(0);
  const activeFiltersRef = useRef("");
  const activeSortRef = useRef<SortOption>("release-new");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const displayCards = useMemo(() => clientSort(cards, sort), [cards, sort]);

  const fetchCards = useCallback(
    async (filterParams: string, sortKey: SortOption, page: number, append: boolean, searchId: number) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const sep = filterParams ? `${filterParams}&` : "";
        // For client-side sorts, use default API ordering
        const apiSort = CLIENT_SORTS.has(sortKey) ? "release-new" : sortKey;
        const res = await fetch(
          `/api/search?${sep}sort=${apiSort}&page=${page}&pageSize=100`
        );
        const data = await res.json();
        const parsed = (data.data || []).map(parseCard);
        const total = data.totalCount || 0;

        if (searchIdRef.current !== searchId) return;

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

  function handleSearch(sortOverride?: SortOption) {
    const id = ++searchIdRef.current;
    const filterParams = buildSearchParams(filters);
    const sortKey = sortOverride || sort;
    activeFiltersRef.current = filterParams;
    activeSortRef.current = sortKey;
    setHasSearched(true);
    setCards([]);
    fetchCards(filterParams, sortKey, 1, false, id);
  }

  function handleSortChange(newSort: SortOption) {
    setSort(newSort);
    if (!hasSearched) return;

    // Client-side sorts don't need a re-fetch
    if (CLIENT_SORTS.has(newSort)) return;

    // Server-side sorts need a fresh fetch
    handleSearch(newSort);
  }

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchCards(
            activeFiltersRef.current,
            activeSortRef.current,
            currentPage + 1,
            true,
            searchIdRef.current
          );
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [hasMore, loading, loadingMore, currentPage, fetchCards]);

  const filterSummary = [
    filters.name && `"${filters.name}"`,
    filters.set && `set: ${filters.set}`,
    filters.supertype && filters.supertype,
    filters.types && `${filters.types} type`,
    filters.rarity && filters.rarity,
    (filters.hpMin || filters.hpMax) &&
      `HP ${filters.hpMin || "0"}-${filters.hpMax || "∞"}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white whitespace-nowrap">
              <span className="text-[#e63946]">Pokemon</span> Card Lookup
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              <SortSelect value={sort} onChange={handleSortChange} />
            </div>
          </div>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {!hasSearched && (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
            <div className="text-6xl mb-6">&#9733;</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Search for Pokemon Cards
            </h2>
            <p className="text-gray-500 max-w-md mb-6">
              Use the filters above to search by name, set, type, rarity, and
              more. Or browse everything at once.
            </p>
            <button
              onClick={() => handleSearch()}
              className="px-6 py-3 rounded-xl bg-[#e63946] hover:bg-[#ff6b6b] text-white font-semibold transition cursor-pointer"
            >
              Browse All Cards
            </button>
          </div>
        )}

        {hasSearched && !loading && (
          <div className="mb-4">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="text-white font-semibold">{cards.length}</span>{" "}
              of{" "}
              <span className="text-white font-semibold">
                {totalCount.toLocaleString()}
              </span>{" "}
              cards
              {filterSummary && (
                <>
                  {" "} — <span className="text-gray-500">{filterSummary}</span>
                </>
              )}
              {CLIENT_SORTS.has(sort) && (
                <span className="text-gray-600 ml-2">
                  (sorted within loaded cards)
                </span>
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
              No cards found. Try adjusting your filters.
            </p>
          </div>
        )}

        {!loading && displayCards.length > 0 && (
          <CardGrid cards={displayCards} />
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
