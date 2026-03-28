import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface CachedCard {
  id: string;
  name: string;
  set: string;
  setId: string;
  setSeries: string;
  setRelease: string;
  setTotal: string;
  rarity: string;
  imageSmall: string;
  imageLarge: string;
  price: number;
  prices: Record<string, Record<string, number>>;
  hp: string;
  supertype: string;
  subtypes: string;
  types: string;
  artist: string;
  number: string;
  tcgplayerUrl: string;
}

let cachedCards: CachedCard[] | null = null;

function loadCache(): CachedCard[] {
  if (cachedCards) return cachedCards;

  const filePath = join(process.cwd(), "data", "cards-by-price.json");
  if (!existsSync(filePath)) return [];

  cachedCards = JSON.parse(readFileSync(filePath, "utf-8"));
  return cachedCards!;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "100");
  const direction = params.get("direction") || "desc"; // desc = price high, asc = price low

  let cards = loadCache();
  if (cards.length === 0) {
    return NextResponse.json({ data: [], totalCount: 0, cached: false });
  }

  // Apply filters
  const name = params.get("name")?.toLowerCase();
  if (name) cards = cards.filter((c) => c.name.toLowerCase().includes(name));

  const set = params.get("set");
  if (set) cards = cards.filter((c) => c.setId === set);

  const supertype = params.get("supertype");
  if (supertype) cards = cards.filter((c) => c.supertype === supertype);

  const types = params.get("types");
  if (types) cards = cards.filter((c) => c.types.includes(types));

  const rarity = params.get("rarity");
  if (rarity) cards = cards.filter((c) => c.rarity === rarity);

  const hpMin = params.get("hpMin");
  const hpMax = params.get("hpMax");
  if (hpMin) cards = cards.filter((c) => parseInt(c.hp) >= parseInt(hpMin));
  if (hpMax) cards = cards.filter((c) => parseInt(c.hp) <= parseInt(hpMax));

  // Direction
  if (direction === "asc") {
    cards = [...cards].reverse();
    // But keep N/A at the bottom
    const withPrice = cards.filter((c) => c.price > 0);
    const noPrice = cards.filter((c) => !c.price);
    cards = [...withPrice, ...noPrice];
  }

  const totalCount = cards.length;
  const start = (page - 1) * pageSize;
  const data = cards.slice(start, start + pageSize);

  return NextResponse.json(
    { data, totalCount, page, pageSize, cached: true },
    {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
