//
// Copyright 2026 DXOS.org
//

import { DeckRoot, DeckLayoutChangeRequest, DeckRootProps } from './DeckRoot';
import { DeckContent } from './DeckContent';
import { DeckViewport } from './DeckViewport';

/**
 * Radix-style composite Deck component.
 */
export const Deck = {
  Root: DeckRoot,
  Content: DeckContent,
  Viewport: DeckViewport,
};

export type { DeckLayoutChangeRequest, DeckRootProps };
