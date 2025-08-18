#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect, Layer, Logger } from 'effect';

import { dx } from './commands';

const run = Command.run(dx, {
  name: 'DXOS CLI',
  version: '0.8.3', // {x-release-please-version}
});

run(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer, Logger.pretty)),
  Effect.scoped,
  NodeRuntime.runMain,
);
