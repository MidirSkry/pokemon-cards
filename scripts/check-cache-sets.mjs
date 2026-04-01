import { readFileSync } from "fs";

async function fetchSets(page = 1, pageSize = 250) {
  const url = `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=${pageSize}&orderBy=-releaseDate`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed fetching sets: ${res.status}`);
  return res.json();
}

function loadCachedSetIds() {
  const raw = readFileSync(new URL("../data/cards-by-price.json", import.meta.url));
  const cards = JSON.parse(raw.toString());
  const setIds = new Set(cards.map((c) => c.setId).filter(Boolean));
  return setIds;
}

async function main() {
  console.log("Loading cached set IDs from data/cards-by-price.json...");
  const cached = loadCachedSetIds();

  console.log("Fetching latest sets from TCG API (first page)...");
  const data = await fetchSets(1, 250);
  const apiSets = (data.data || []).map((s) => ({ id: s.id, name: s.name, releaseDate: s.releaseDate }));

  const missing = apiSets.filter((s) => !cached.has(s.id));

  if (missing.length === 0) {
    console.log("All fetched sets are present in the cache.");
    process.exit(0);
  }

  console.log(`Found ${missing.length} set(s) missing from the cache:`);
  for (const s of missing) {
    console.log(`- ${s.id}: ${s.name} (${s.releaseDate?.slice(0,10) || 'unknown'})`);
  }

  // Exit with non-zero code to highlight failure in CI if desired
  process.exit(1);
}

main().catch((err) => {
  console.error("Checker failed:", err);
  process.exit(2);
});
