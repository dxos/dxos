//
// Copyright 2025 DXOS.org
//

import { Effect, type Context } from 'effect';

import { LogLevel } from '@dxos/log';

import { type EventLogger, createEventLogger } from '../services';

export const noopLogger: Context.Tag.Service<EventLogger> = {
  log: () => Effect.succeed(undefined),
  nodeId: undefined,
};

export const consoleLogger: Context.Tag.Service<EventLogger> = createEventLogger(LogLevel.INFO);
