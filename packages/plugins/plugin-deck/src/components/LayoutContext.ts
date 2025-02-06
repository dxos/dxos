//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type Layout } from '../types';

export const LayoutContext: Context<Layout | null> = createContext<Layout | null>(null);

export const useLayout = (): Layout => useContext(LayoutContext) ?? raise(new Error('Missing LayoutContext'));
