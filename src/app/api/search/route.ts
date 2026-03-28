import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const url = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(name)}&orderBy=-set.releaseDate&pageSize=100`;
  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json(data);
}
