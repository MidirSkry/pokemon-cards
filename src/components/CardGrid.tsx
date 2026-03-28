"use client";

import { useState } from "react";
import CardModal from "./CardModal";

export interface PokemonCard {
  name: string;
  set: string;
  rarity: string;
  price: number;
  imageSmall: string;
  imageLarge: string;
  artist: string;
  number: string;
  setTotal: string;
  setSeries: string;
  setRelease: string;
  types: string;
  hp: string;
  supertype: string;
  subtypes: string;
  pricesDetail: Record<string, Record<string, number>>;
  tcgplayerUrl: string;
}

interface CardGridProps {
  cards: PokemonCard[];
}

export default function CardGrid({ cards }: CardGridProps) {
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cards.map((card, i) => (
          <div
            key={`${card.name}-${card.set}-${card.number}-${i}`}
            onClick={() => setSelectedCard(card)}
            className="group cursor-pointer bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-purple-900/20 transition-all duration-200 hover:-translate-y-1"
          >
            {/* Card image */}
            <div className="aspect-[5/7] overflow-hidden bg-black/20">
              {card.imageSmall ? (
                <img
                  src={card.imageSmall}
                  alt={card.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  No Image
                </div>
              )}
            </div>

            {/* Card info */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-white truncate">
                {card.name}
              </h3>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {card.set}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{card.rarity}</span>
                <span
                  className={`text-sm font-bold ${
                    card.price > 0 ? "text-[#ffd700]" : "text-gray-600"
                  }`}
                >
                  {card.price > 0 ? `$${card.price.toFixed(2)}` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  );
}
