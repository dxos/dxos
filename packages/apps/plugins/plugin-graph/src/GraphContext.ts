// TODO(wittjosiah): State can be a GraphNode.
//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';
import { Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { GraphNode } from './types';

export const GraphContext: Context<DeepSignal<GraphNode> | null> = createContext<DeepSignal<GraphNode> | null>(null);

export const useGraph = (): DeepSignal<GraphNode> =>
  useContext(GraphContext) ?? raise(new Error('GraphContext not found'));
