//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

import { layer as clientServiceLayer, layerMemory as configServiceLayerMemory } from '@dxos/client';

import { CommandConfig } from '../services';
import { TestConsole } from './test-console';

export const TestLayer = Function.pipe(
  clientServiceLayer,
  Layer.provideMerge(configServiceLayerMemory),
  Layer.provideMerge(TestConsole.layer),
  Layer.provideMerge(CommandConfig.layerTest),
);
