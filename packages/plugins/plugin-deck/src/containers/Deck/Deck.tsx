//
// Copyright 2026 DXOS.org
//

import { DeckContent, DeckContentProps } from './DeckContent';
import { DeckLayoutChangeRequest, DeckRoot, DeckRootProps } from './DeckRoot';
import { DeckContentEmpty, DeckMultiMode, DeckSoloMode, DeckViewport, DeckViewportProps } from './DeckViewport';

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

export type { DeckContentProps, DeckLayoutChangeRequest, DeckRootProps, DeckViewportProps };
