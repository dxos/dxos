//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type PluginManager } from '@dxos/app-framework';

import { type DeckStateHook } from '../../hooks/useDeckState';
import { type LayoutMode, type Settings } from '../../types';
import React, { PropsWithChildren } from 'react';

const DECK_NAME = 'Deck';
const DECK_ROOT_NAME = 'DeckRoot';

/** Request to change the layout mode. */
export type DeckLayoutChangeRequest = { subject?: string; mode: LayoutMode } | { revert: true };

//
// Context
//

export type DeckContextValue = {
  /** Deck plugin settings. */
  settings?: Settings.Settings;
  /** Plugin manager for capability access. */
  pluginManager: PluginManager.PluginManager;
  /** Layout mode. */
  layoutMode: LayoutMode;
  /** Callback for layout mode changes. */
  onLayoutChange: (request: DeckLayoutChangeRequest) => void;
} & Pick<DeckStateHook, 'state' | 'deck' | 'updateState'>;

export const [DeckProvider, useDeckContext] = createContext<DeckContextValue>(DECK_NAME);

//
// Root
//

export type DeckRootProps = PropsWithChildren<DeckContextValue>;

/**
 * Headless root that provides Deck context.
 */
export const DeckRoot = ({ children, ...context }: DeckRootProps) => {
  return <DeckProvider {...context}>{children}</DeckProvider>;
};

DeckRoot.displayName = DECK_ROOT_NAME;
