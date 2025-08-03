//
// Copyright 2025 DXOS.org
//

import { type Context, Effect } from 'effect';

import { LogLevel } from '@dxos/log';

import { type ComputeEventLogger, createEventLogger } from '../services';

export const noopLogger: Context.Tag.Service<ComputeEventLogger> = {
  log: () => Effect.succeed(undefined),
  nodeId: undefined,
};

export const consoleLogger: Context.Tag.Service<ComputeEventLogger> = createEventLogger(LogLevel.INFO);
