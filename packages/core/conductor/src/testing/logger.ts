//
// Copyright 2025 DXOS.org
//

import { Effect, type Context } from 'effect';

import { LogLevel } from '@dxos/log';

import { type EventLogger, createDxosEventLogger } from '../services';

export const noopLogger: Context.Tag.Service<EventLogger> = {
  log: () => Effect.succeed(undefined),
  nodeId: undefined,
};

export const consoleLogger: Context.Tag.Service<EventLogger> = createDxosEventLogger(LogLevel.INFO);
