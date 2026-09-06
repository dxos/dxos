#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import * as BunServices from '@effect/platform-bun/BunServices';
import * as Effect from 'effect/Effect';

import { Cli } from '../src/index.ts';

Cli.run(process.argv.slice(2)).pipe(Effect.provide(BunServices.layer), Effect.scoped, BunRuntime.runMain());
