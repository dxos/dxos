//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import type { Node } from '@braneframe/plugin-graph';
import type { Layout } from '@dxos/app-framework';
import { raise } from '@dxos/debug';

export type LayoutState = Layout & {
  activeNode: Node | undefined;
  previousNode: Node | undefined;
};

export const LayoutContext: Context<LayoutState | null> = createContext<LayoutState | null>(null);

export const useLayout = (): LayoutState => useContext(LayoutContext) ?? raise(new Error('Missing LayoutContext'));
