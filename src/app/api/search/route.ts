import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const page = request.nextUrl.searchParams.get("page") || "1";
  const pageSize = request.nextUrl.searchParams.get("pageSize") || "100";

  const query = name ? `q=name:${encodeURIComponent(name)}&` : "";
  const url = `https://api.pokemontcg.io/v2/cards?${query}orderBy=-set.releaseDate&page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json(data);
}
