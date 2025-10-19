//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { LogLevel } from '@dxos/log';

import { type ComputeEventLogger, createEventLogger } from '../services';

export const noopLogger: Context.Tag.Service<ComputeEventLogger> = {
  log: () => Effect.succeed(undefined),
  nodeId: undefined,
};

export const consoleLogger: Context.Tag.Service<ComputeEventLogger> = createEventLogger(LogLevel.INFO);
