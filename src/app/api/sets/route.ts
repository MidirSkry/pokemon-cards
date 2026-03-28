import { NextResponse } from "next/server";

let cachedSets: unknown[] | null = null;

export async function GET() {
  if (cachedSets) {
    return NextResponse.json(cachedSets);
  }

  const res = await fetch(
    "https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250"
  );
  const data = await res.json();
  cachedSets = data.data || [];

  return NextResponse.json(cachedSets);
}
