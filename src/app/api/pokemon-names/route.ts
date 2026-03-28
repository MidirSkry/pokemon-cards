import { NextResponse } from "next/server";

let cachedNames: string[] | null = null;

export async function GET() {
  if (cachedNames) {
    return NextResponse.json(cachedNames);
  }

  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1500");
  const data = await res.json();
  cachedNames = data.results.map(
    (p: { name: string }) => p.name.charAt(0).toUpperCase() + p.name.slice(1)
  );

  return NextResponse.json(cachedNames);
}
