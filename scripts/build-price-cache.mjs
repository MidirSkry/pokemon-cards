// Fetches all Pokemon cards from the TCG API and writes a price-sorted cache file.
// Runs during build time — no function timeout limits.

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PAGE_SIZE = 250;
const BATCH_SIZE = 5; // concurrent requests per batch

async function fetchPage(page) {
  const url = `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=${PAGE_SIZE}&select=id,name,set,rarity,images,tcgplayer,hp,supertype,subtypes,types,artist,number`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error page ${page}: ${res.status}`);
  return res.json();
}

function extractCard(card) {
  let price = 0;
  const prices = {};

  if (card.tcgplayer?.prices) {
    for (const [variant, data] of Object.entries(card.tcgplayer.prices)) {
      prices[variant] = data;
      if (data.market && price === 0) price = data.market;
    }
  }

  return {
    id: card.id,
    name: card.name,
    set: card.set?.name || "Unknown",
    setId: card.set?.id || "",
    setSeries: card.set?.series || "Unknown",
    setRelease: card.set?.releaseDate || "Unknown",
    setTotal: card.set?.printedTotal?.toString() || "?",
    rarity: card.rarity || "Unknown",
    imageSmall: card.images?.small || "",
    imageLarge: card.images?.large || "",
    price,
    prices,
    hp: card.hp || "N/A",
    supertype: card.supertype || "Unknown",
    subtypes: (card.subtypes || []).join(", ") || "N/A",
    types: (card.types || []).join(", ") || "N/A",
    artist: card.artist || "Unknown",
    number: card.number || "?",
    tcgplayerUrl: card.tcgplayer?.url || "",
  };
}

async function main() {
  console.log("Fetching page 1 to get total count...");
  const first = await fetchPage(1);
  const totalCount = first.totalCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  console.log(`Total cards: ${totalCount}, pages: ${totalPages}`);

  let allCards = first.data.map(extractCard);
  console.log(`Page 1: ${first.data.length} cards`);

  // Fetch remaining pages in batches
  for (let batch = 1; batch < totalPages; batch += BATCH_SIZE) {
    const pages = [];
    for (let p = batch + 1; p <= Math.min(batch + BATCH_SIZE, totalPages); p++) {
      pages.push(p);
    }

    const results = await Promise.all(pages.map(fetchPage));
    for (const result of results) {
      allCards = allCards.concat(result.data.map(extractCard));
    }
    console.log(`Fetched pages ${pages[0]}-${pages[pages.length - 1]}: ${allCards.length} cards total`);
  }

  // Sort by price descending
  const byPrice = [...allCards].sort((a, b) => {
    if (!a.price && !b.price) return 0;
    if (!a.price) return 1;
    if (!b.price) return -1;
    return b.price - a.price;
  });

  mkdirSync(DATA_DIR, { recursive: true });

  // Write full sorted cache
  writeFileSync(
    join(DATA_DIR, "cards-by-price.json"),
    JSON.stringify(byPrice)
  );

  // Write metadata
  writeFileSync(
    join(DATA_DIR, "cache-meta.json"),
    JSON.stringify({
      totalCards: allCards.length,
      cardsWithPrice: allCards.filter((c) => c.price > 0).length,
      updatedAt: new Date().toISOString(),
    })
  );

  console.log(`\nCache built successfully!`);
  console.log(`Total cards: ${allCards.length}`);
  console.log(`Cards with price: ${allCards.filter((c) => c.price > 0).length}`);
  console.log(`Written to ${DATA_DIR}`);
}

main().catch((err) => {
  console.error("Cache build failed:", err);
  // Don't fail the build — the app works without the cache
  process.exit(0);
});
