#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect, Layer, Logger } from 'effect';

import { run } from './commands';

run(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer, Logger.pretty)),
  Effect.scoped,
  NodeRuntime.runMain,
);
