//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import type * as ProcessManager from './ProcessManager.ts';

/**
 * Service tag for the {@link Manager}.
 *
 * Lives in its own module so consumers (notably `ProcessOperationInvoker.ts`)
 * can import it without pulling in `ProcessManager.ts` as a value import.
 */
export class ProcessManagerService extends Context.Service<ProcessManagerService, ProcessManager.Manager>()(
  '@dxos/functions-runtime/ProcessManagerService',
) {}
