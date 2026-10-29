//
// Copyright 2026 DXOS.org
//

import { type RatingModel, type RatingOverrides } from '../model/rating.ts';

/** A real rating model the agent wrote for the board game café session (run composer-20261028-103340). */
export const sessionModel: RatingModel = {
  version: 6,
  rationale:
    "Goal is board game cafés in Bangkok with a big game library. The thumbs-up is Timeless Garden Rooftop (4.9, 136 reviews, no published library size), so rating is scored as closeness to that proven sweet spot (4.9 ±0.15) instead of raw top-end - that stops thin-sample 5.0 mall listings outranking it - stated library size stays a strong term so Dice Cup's 400+ games remains high, and review volume is only a small tie-breaker.",
  terms: [
    {
      id: 'rating',
      label: 'Rating near the liked sweet spot (4.9)',
      weight: 0.5,
      value: {
        prop: 'schema:ratingValue',
      },
      shape: {
        target: 4.9,
        tolerance: 0.15,
      },
      missing: 0.4,
    },
    {
      id: 'library',
      label: 'Big game library',
      weight: 0.25,
      value: {
        match: 'schema:description',
        pattern: 'big library|largest|400|hundreds|thousands|extensive|vast|wall of games|shelves',
      },
      shape: 'flag',
      missing: 0.8,
    },
    {
      id: 'isboardgame',
      label: 'Board game venue by name',
      weight: 0.15,
      value: {
        match: 'schema:name',
        pattern:
          'board ?game|Dice Cup|Stronghold|Quest|GameHaus|More Than a Game|Tortuga|Battlefield|Guild|Box & Brew|Tea Run|Turn The Tables|Lanlalen|Nostramo|Iron Kraken|DaBush|basement|Timeless|Siam Board',
      },
      shape: 'flag',
      missing: 0.2,
    },
    {
      id: 'reviews',
      label: 'Review volume',
      weight: 0.1,
      value: {
        prop: 'schema:reviewCount',
      },
      shape: 'higher',
      missing: 0.3,
    },
  ],
  updatedAt: '2026-10-28T10:37:13.163Z',
};

/** The person's adjustments over it: one weight nudged, one term off. */
export const sessionOverrides: RatingOverrides = { terms: { rating: { weight: 1.0 }, reviews: { off: true } } };
