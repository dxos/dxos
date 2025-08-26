#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect, Layer, Logger } from 'effect';

import { LogLevel, levels, log } from '@dxos/log';

import { dx } from './commands';
import { DXOS_VERSION } from './version';

let filter = LogLevel.ERROR;
const level = process.env.DX_DEBUG;
if (level) {
  filter = levels[level] ?? LogLevel.ERROR;
}
log.config({ filter });

if (process.env.DX_TRACK_LEAKS) {
  const wtf = await import('wtfnode');
  (globalThis as any).wtf = wtf;
}

const run = Command.run(dx, {
  name: 'DXOS CLI',
  version: DXOS_VERSION,
});

run(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer, Logger.pretty)),
  Effect.scoped,
  NodeRuntime.runMain,
);
