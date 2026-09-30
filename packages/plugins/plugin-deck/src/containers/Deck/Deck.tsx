//
// Copyright 2026 DXOS.org
//

import { DeckContent, DeckContentProps } from './DeckContent.tsx';
import { DeckRoot, DeckRootProps } from './DeckRoot.tsx';
import { DeckContentEmpty, DeckPlanks, DeckViewport, DeckViewportProps } from './DeckViewport.tsx';

/**
 * Radix-style composite Deck component.
 */
export const Deck = {
  Root: DeckRoot,
  Content: DeckContent,
  Viewport: DeckViewport,
  ContentEmpty: DeckContentEmpty,
  Planks: DeckPlanks,
};

export type { DeckContentProps, DeckRootProps, DeckViewportProps };
