//
// Copyright 2025 DXOS.org
//

import { type DeckStateProps } from '../types';

/**
 * Sanitizes persisted deck state on startup.
 *
 * Persisted state may contain values that are inappropriate to restore across sessions:
 *
 * - **Fullscreen**: Cleared unconditionally to prevent the user from getting stuck in fullscreen
 *   mode if the app was closed (or crashed) while fullscreen was active.
 *
 * - **Active planks in solo-mode decks**: When a deck is in solo mode, any items in `active`
 *   represent planks that were kept mounted (hidden) during the session for fast deck↔solo
 *   switching. After a restart these planks would need to fully remount anyway, so retaining
 *   them only adds unnecessary load. Clearing `active` for solo-mode decks avoids rendering
 *   stale planks in the background on startup.
 *
 * Returns a new state object if any changes were made, or the original state if clean.
 */
export const sanitizePersistedState = (state: DeckStateProps): DeckStateProps => {
  let needsUpdate = false;
  const cleanedDecks = { ...state.decks };

  for (const [id, deck] of Object.entries(cleanedDecks)) {
    if (!deck) {
      continue;
    }

    let updated = false;
    let cleanedDeck = deck;

    if (deck.fullscreen) {
      cleanedDeck = { ...cleanedDeck, fullscreen: false };
      updated = true;
    }

    if (deck.solo && deck.active.length > 0) {
      cleanedDeck = { ...cleanedDeck, active: [] };
      updated = true;
    }

    if (updated) {
      cleanedDecks[id] = cleanedDeck;
      needsUpdate = true;
    }
  }

  return needsUpdate ? { ...state, decks: cleanedDecks } : state;
};
