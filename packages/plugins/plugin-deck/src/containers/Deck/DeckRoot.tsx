//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { PropsWithChildren } from 'react';

import { type PluginManager } from '@dxos/app-framework';

import { type Settings } from '#types';

import { type DeckStateHook } from '../../hooks/useDeckState';

const DECK_NAME = 'Deck';
const DECK_ROOT_NAME = 'DeckRoot';

//
// Context
//

export type DeckContextValue = {
  /** Deck plugin settings. */
  settings?: Settings.Settings;
  /** Plugin manager for capability access. */
  pluginManager: PluginManager.PluginManager;
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
