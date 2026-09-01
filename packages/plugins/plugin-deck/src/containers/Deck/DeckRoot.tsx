//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo } from 'react';

import type * as PluginManager from '@dxos/app-framework/PluginManager';
import { useMediaQuery } from '@dxos/react-ui';

import { Settings } from '#types';

import { type DeckStateHook } from '../../hooks/useDeckState.ts';
import { resolveSidebarState } from '../../util/index.ts';

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
export const DeckRoot = ({ children, state, ...context }: DeckRootProps) => {
  const [isLg] = useMediaQuery('lg');

  // Resolved here rather than at each consumer so the sidebar width, `Main.Root` and the navtree all
  // read one value; the persisted `closed` is left intact because it still applies below `lg`.
  const resolvedState = useMemo(
    () => ({ ...state, sidebarState: resolveSidebarState(state.sidebarState, isLg) }),
    [state, isLg],
  );

  return (
    <DeckProvider {...context} state={resolvedState}>
      {children}
    </DeckProvider>
  );
};

DeckRoot.displayName = DECK_ROOT_NAME;
