#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect, Logger } from 'effect';

import { run } from './commands';

run(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  Effect.provide(Logger.pretty),
  Effect.scoped,
  NodeRuntime.runMain,
);
