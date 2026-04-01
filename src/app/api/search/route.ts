import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load price cache once for filling in missing prices from the API
let priceMap: Map<string, { price: number; prices: Record<string, Record<string, number>> }> | null = null;

function getPriceMap() {
  if (priceMap) return priceMap;
  const filePath = join(process.cwd(), "data", "cards-by-price.json");
  if (!existsSync(filePath)) return new Map();
  const cards = JSON.parse(readFileSync(filePath, "utf-8"));
  priceMap = new Map();
  for (const c of cards) {
    if (c.price > 0) {
      priceMap.set(c.id, { price: c.price, prices: c.prices });
    }
  }
  return priceMap;
}

const ORDER_MAP: Record<string, string> = {
  "release-new": "-set.releaseDate",
  "release-old": "set.releaseDate",
  "hp-high": "-hp",
  "hp-low": "hp",
  "name-az": "name",
  "name-za": "-name",
  "number": "number",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "100";
  const sort = params.get("sort") || "release-new";

  const queryParts: string[] = [];

  const name = params.get("name");
  if (name) queryParts.push(`name:"${name}*"`);

  const set = params.get("set");
  if (set) queryParts.push(`set.id:${set}`);

  const supertype = params.get("supertype");
  if (supertype) queryParts.push(`supertype:${supertype}`);

  const types = params.get("types");
  if (types) queryParts.push(`types:${types}`);

  const rarity = params.get("rarity");
  if (rarity) queryParts.push(`rarity:"${rarity}"`);

  const hpMin = params.get("hpMin");
  const hpMax = params.get("hpMax");
  if (hpMin && hpMax) queryParts.push(`hp:[${hpMin} TO ${hpMax}]`);
  else if (hpMin) queryParts.push(`hp:[${hpMin} TO *]`);
  else if (hpMax) queryParts.push(`hp:[* TO ${hpMax}]`);

  const orderBy = ORDER_MAP[sort] || "-set.releaseDate";
  const queryStr = queryParts.length > 0 ? `q=${encodeURIComponent(queryParts.join(" "))}&` : "";
  const select = "id,name,set,rarity,images,tcgplayer,hp,supertype,subtypes,types,artist,number";
  const url = `https://api.pokemontcg.io/v2/cards?${queryStr}orderBy=${orderBy}&page=${page}&pageSize=${pageSize}&select=${encodeURIComponent(select)}`;
  const res = await fetch(url);
  const data = await res.json();

  // Merge cached prices into cards missing them from the API
  if (data.data?.length) {
    const cache = getPriceMap();
    for (const card of data.data) {
      if (!card.tcgplayer?.prices && cache.has(card.id)) {
        const cached = cache.get(card.id)!;
        card.tcgplayer = {
          ...card.tcgplayer,
          prices: cached.prices,
        };
      }
    }
  }

  return NextResponse.json(data);
}
