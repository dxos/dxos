//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type LayoutState } from './types';

export const LayoutContext: Context<LayoutState | null> = createContext<LayoutState | null>(null);

export const useLayout = (): LayoutState => useContext(LayoutContext) ?? raise(new Error('Missing LayoutContext'));
