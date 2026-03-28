import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "100";

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

  const queryStr = queryParts.length > 0 ? `q=${encodeURIComponent(queryParts.join(" "))}&` : "";
  const url = `https://api.pokemontcg.io/v2/cards?${queryStr}orderBy=-set.releaseDate&page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json(data);
}
