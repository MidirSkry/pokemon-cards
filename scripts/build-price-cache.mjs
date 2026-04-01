// Fetches card metadata from pokemontcg.io and prices from TCGPlayer's API.
// Runs during build time — no function timeout limits.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PRODUCT_MAP_PATH = join(DATA_DIR, "product-map.json");
const PAGE_SIZE = 250;
const BATCH_SIZE = 5;          // concurrent pokemontcg.io page fetches
const TCG_BATCH_SIZE = 25;     // concurrent TCGPlayer requests

// ── pokemontcg.io: card metadata ────────────────────────────────────────────

async function fetchPage(page) {
  const url = `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=${PAGE_SIZE}&select=id,name,set,rarity,images,tcgplayer,hp,supertype,subtypes,types,artist,number`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error page ${page}: ${res.status}`);
  return res.json();
}

function extractCard(card) {
  let price = 0;
  const prices = {};

  // Use pokemontcg.io prices as primary source (sourced from TCGPlayer, good coverage)
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

// ── TCGPlayer: prices ───────────────────────────────────────────────────────

function loadProductMap() {
  if (existsSync(PRODUCT_MAP_PATH)) {
    return JSON.parse(readFileSync(PRODUCT_MAP_PATH, "utf-8"));
  }
  return {};
}

function saveProductMap(map) {
  writeFileSync(PRODUCT_MAP_PATH, JSON.stringify(map));
}

async function resolveProductId(tcgplayerUrl) {
  const redir = await fetch(tcgplayerUrl, { redirect: "manual" });
  const loc = redir.headers.get("location") || "";
  const match = loc.match(/product\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchTcgPlayerPrices(productId) {
  const res = await fetch(
    `https://mpapi.tcgplayer.com/v2/product/${productId}/pricepoints`
  );
  if (!res.ok) return null;
  return res.json();
}

function applyPricePoints(card, points) {
  for (const pt of points) {
    const variant = pt.printingType === "Foil" ? "holofoil" : "normal";
    const data = {};
    if (pt.marketPrice != null) data.market = pt.marketPrice;
    if (pt.listedMedianPrice != null) data.mid = pt.listedMedianPrice;
    if (Object.keys(data).length > 0) {
      card.prices[variant] = data;
      if (data.market && card.price === 0) card.price = data.market;
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Phase 1: Fetch card metadata from pokemontcg.io
  console.log("Phase 1: Fetching card metadata from pokemontcg.io...");
  const first = await fetchPage(1);
  const totalCount = first.totalCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  console.log(`Total cards: ${totalCount}, pages: ${totalPages}`);

  let allCards = first.data.map(extractCard);
  console.log(`Page 1: ${first.data.length} cards`);

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

  // Phase 2: Fetch prices from TCGPlayer for cards that pokemontcg.io missed
  const priceable = allCards.filter((c) => c.price === 0 && c.tcgplayerUrl);
  console.log(`\nPhase 2: ${allCards.filter(c => c.price > 0).length} cards already have prices from pokemontcg.io`);
  console.log(`Fetching prices from TCGPlayer for ${priceable.length} remaining cards...`);

  // Load cached card-id → product-id map to avoid re-resolving redirects
  const productMap = loadProductMap();
  const needsResolve = priceable.filter((c) => !productMap[c.id]);
  const alreadyMapped = priceable.length - needsResolve.length;
  if (alreadyMapped > 0) console.log(`  ${alreadyMapped} product IDs cached from previous build`);
  if (needsResolve.length > 0) console.log(`  Resolving ${needsResolve.length} new product IDs...`);

  // Resolve missing product IDs
  for (let i = 0; i < needsResolve.length; i += TCG_BATCH_SIZE) {
    const batch = needsResolve.slice(i, i + TCG_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (card) => {
      try {
        const pid = await resolveProductId(card.tcgplayerUrl);
        return { cardId: card.id, productId: pid };
      } catch {
        return { cardId: card.id, productId: null };
      }
    }));
    for (const r of results) {
      if (r.productId) productMap[r.cardId] = r.productId;
    }
    const done = Math.min(i + TCG_BATCH_SIZE, needsResolve.length);
    if (done < needsResolve.length || needsResolve.length > TCG_BATCH_SIZE) {
      console.log(`  Resolved ${done}/${needsResolve.length} product IDs`);
    }

    // Save periodically so progress isn't lost on timeout/crash
    if (done % 500 < TCG_BATCH_SIZE || done === needsResolve.length) {
      saveProductMap(productMap);
    }
  }

  // Fetch prices from TCGPlayer
  const withProductId = priceable.filter((c) => productMap[c.id]);
  console.log(`  Fetching prices for ${withProductId.length} cards...`);
  let filled = 0;

  for (let i = 0; i < withProductId.length; i += TCG_BATCH_SIZE) {
    const batch = withProductId.slice(i, i + TCG_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (card) => {
      try {
        const points = await fetchTcgPlayerPrices(productMap[card.id]);
        return { cardId: card.id, points };
      } catch {
        return { cardId: card.id, points: null };
      }
    }));

    for (const r of results) {
      if (!r.points?.length) continue;
      const card = allCards.find((c) => c.id === r.cardId);
      if (!card) continue;
      applyPricePoints(card, r.points);
      if (card.price > 0) filled++;
    }

    const done = Math.min(i + TCG_BATCH_SIZE, withProductId.length);
    if (done % 500 < TCG_BATCH_SIZE || done === withProductId.length) {
      console.log(`  Prices: ${done}/${withProductId.length} fetched (${filled} with price)`);
    }
  }

  // Sort by price descending
  const byPrice = [...allCards].sort((a, b) => {
    if (!a.price && !b.price) return 0;
    if (!a.price) return 1;
    if (!b.price) return -1;
    return b.price - a.price;
  });

  mkdirSync(DATA_DIR, { recursive: true });

  writeFileSync(
    join(DATA_DIR, "cards-by-price.json"),
    JSON.stringify(byPrice)
  );

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
