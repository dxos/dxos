//
// Copyright 2026 DXOS.org
//

import { DeckContent, DeckContentProps } from './DeckContent';
import { DeckRoot, DeckLayoutChangeRequest, DeckRootProps } from './DeckRoot';
import { DeckViewport, DeckMultiMode, DeckSoloMode, DeckViewportProps, DeckContentEmpty } from './DeckViewport';

/**
 * Radix-style composite Deck component.
 */
export const Deck = {
  Root: DeckRoot,
  Content: DeckContent,
  Viewport: DeckViewport,
  ContentEmpty: DeckContentEmpty,
  MultiMode: DeckMultiMode,
  SoloMode: DeckSoloMode,
};

export type { DeckLayoutChangeRequest, DeckRootProps, DeckContentProps, DeckViewportProps };
