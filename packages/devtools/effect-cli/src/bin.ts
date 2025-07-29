#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import * as NodeContext from '@effect/platform-node/NodeContext';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as Effect from 'effect/Effect';

import { run } from './Cli.js';

run(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain({ disableErrorReporting: true }));
