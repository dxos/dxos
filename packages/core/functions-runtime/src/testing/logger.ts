//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type ComputeEventLogger, createEventLogger } from '@dxos/functions';
import { LogLevel } from '@dxos/log';

export const noopLogger: Context.Tag.Service<ComputeEventLogger> = {
  log: () => Effect.succeed(undefined),
  nodeId: undefined,
};

export const consoleLogger: Context.Tag.Service<ComputeEventLogger> = createEventLogger(LogLevel.INFO);
