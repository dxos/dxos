//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type PluginManager } from '@dxos/app-framework';

import { type DeckStateHook } from '../../hooks/useDeckState';
import { type LayoutMode, type Settings } from '../../types';

const DECK_MAIN_NAME = 'DeckMain';

/** Request to change the layout mode. */
export type LayoutChangeRequest = { subject?: string; mode: string } | { revert: true };

export type DeckMainContextValue = {
  /** Deck plugin settings. */
  settings?: Settings.Settings;
  /** Plugin manager for capability access. */
  pluginManager: PluginManager.PluginManager;
  /** Layout mode. */
  layoutMode: LayoutMode;
  /** Callback for layout mode changes. */
  onLayoutChange: (request: LayoutChangeRequest) => void;
} & Pick<DeckStateHook, 'state' | 'deck' | 'updateState'>;

export const [DeckMainProvider, useDeckMainContext] = createContext<DeckMainContextValue>(DECK_MAIN_NAME);
