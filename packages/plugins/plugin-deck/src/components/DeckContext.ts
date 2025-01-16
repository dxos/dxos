//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { type LayoutMode } from '@dxos/app-framework';
import { raise } from '@dxos/debug';

export type PlankSizing = Record<string, number>;
export type DeckContextType = {
  plankSizing: PlankSizing;
  currentUndoId: string | undefined;
  layoutModeHistory: LayoutMode[];
};

export const DeckContext: Context<DeckContextType | null> = createContext<DeckContextType | null>(null);

export const useDeckContext = (): DeckContextType => useContext(DeckContext) ?? raise(new Error('Missing DeckContext'));
