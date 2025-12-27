//
// Copyright 2025 DXOS.org
//

import { type GraphBuilder } from '@dxos/app-graph';

import { Capabilities } from '../common';

import { useCapability } from './useCapabilities';

export const useIntentDispatcher = () => useCapability(Capabilities.IntentDispatcher);

export const useAppGraph = (): Readonly<Pick<GraphBuilder.GraphBuilder, 'graph' | 'explore'>> =>
  useCapability(Capabilities.AppGraph);

export const useLayout = () => useCapability(Capabilities.Layout);
