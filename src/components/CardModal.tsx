"use client";

import { PokemonCard } from "./CardGrid";

interface CardModalProps {
  card: PokemonCard;
  onClose: () => void;
}

export default function CardModal({ card, onClose }: CardModalProps) {
  const details = [
    { label: "Type", value: card.supertype },
    { label: "Subtypes", value: card.subtypes },
    { label: "HP", value: card.hp },
    { label: "Energy", value: card.types },
    { label: "Set", value: `${card.set} (${card.setSeries})` },
    { label: "Card #", value: `${card.number}/${card.setTotal}` },
    { label: "Released", value: card.setRelease },
    { label: "Rarity", value: card.rarity },
    { label: "Artist", value: card.artist },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white text-lg cursor-pointer"
        >
          x
        </button>

        <div className="p-6 flex flex-col items-center gap-6">
          {/* Large card image */}
          <div className="relative">
            <img
              src={card.imageLarge || card.imageSmall}
              alt={card.name}
              className="w-[300px] rounded-xl shadow-lg shadow-black/50"
            />
          </div>

          {/* Card name */}
          <h2 className="text-2xl font-bold text-white text-center">
            {card.name}
          </h2>

          {/* Details grid */}
          <div className="w-full grid grid-cols-2 gap-3">
            {details.map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  {label}
                </div>
                <div className="text-sm text-white mt-1">{value}</div>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          {Object.keys(card.pricesDetail).length > 0 && (
            <div className="w-full">
              <h3 className="text-lg font-semibold text-[#ffd700] mb-3">
                Price Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(card.pricesDetail).map(
                  ([variant, prices]) => (
                    <div
                      key={variant}
                      className="bg-white/5 rounded-lg p-4"
                    >
                      <div className="text-sm font-semibold text-gray-300 mb-2 capitalize">
                        {variant
                          .replace(/([A-Z])/g, " $1")
                          .replace("holofoil", "Holofoil")
                          .trim()}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          ["low", "mid", "high", "market"] as const
                        ).map((key) => {
                          const val =
                            prices[
                              key as keyof typeof prices
                            ];
                          if (!val) return null;
                          return (
                            <div key={key}>
                              <div className="text-xs text-gray-500 capitalize">
                                {key}
                              </div>
                              <div className="text-sm text-white font-mono">
                                $
                                {(val as number).toFixed(
                                  2
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Buy button */}
          {card.tcgplayerUrl && (
            <a
              href={card.tcgplayerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-[#e63946] hover:bg-[#ff6b6b] text-white font-semibold text-center transition shadow-lg shadow-red-900/30"
            >
              Buy on TCGPlayer
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
