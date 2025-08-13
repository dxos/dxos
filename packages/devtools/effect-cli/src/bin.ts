#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';

import { run } from './commands';
import { ClientService } from './services';

run(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  Effect.provide(ClientService.layer),
  NodeRuntime.runMain({ disableErrorReporting: true }),
);
