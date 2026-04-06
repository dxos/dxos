//
// Copyright 2026 DXOS.org
//

import { DeckRoot, DeckLayoutChangeRequest, DeckRootProps } from './DeckRoot';
import { DeckContent } from './DeckContent';
import { DeckViewport, DeckMultiMode, DeckSoloMode } from './DeckViewport';

/**
 * Radix-style composite Deck component.
 */
export const Deck = {
  Root: DeckRoot,
  Content: DeckContent,
  Viewport: DeckViewport,
  MultiMode: DeckMultiMode,
  SoloMode: DeckSoloMode,
};

export type { DeckLayoutChangeRequest, DeckRootProps };
