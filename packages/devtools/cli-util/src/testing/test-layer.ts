//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

import {
  ClientService,
  ConfigService,
  layer as clientServiceLayer,
  layerMemory as configServiceLayerMemory,
} from '@dxos/client';

import { CommandConfig } from '../services/index.ts';
import { TestConsole } from './test-console.ts';

// Annotated explicitly: without it, `Effect.provide(TestLayer)` at call sites infers the
// remaining requirement as `any` instead of `never` — a chained `Layer.provideMerge` generic
// composition TypeScript can't carry through an exported const without help.
export const TestLayer: Layer.Layer<
  ClientService | CommandConfig | ConfigService | TestConsole.TestConsole,
  Cause.UnknownError,
  never
> = Function.pipe(
  clientServiceLayer,
  Layer.provideMerge(configServiceLayerMemory),
  Layer.provideMerge(TestConsole.layer),
  Layer.provideMerge(CommandConfig.layerTest),
);
