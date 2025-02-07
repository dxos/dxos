//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type DeckState } from '../types';

export const LayoutContext: Context<DeckState | null> = createContext<DeckState | null>(null);

export const useLayout = (): DeckState => useContext(LayoutContext) ?? raise(new Error('Missing LayoutContext'));
