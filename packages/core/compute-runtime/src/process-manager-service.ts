//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import type { Manager } from './ProcessManager';

/**
 * Service tag for the {@link Manager}.
 *
 * Lives in its own module so consumers (notably `ProcessOperationInvoker.ts`)
 * can import it without pulling in `ProcessManager.ts` as a value import.
 */
export class ProcessManagerService extends Context.Tag('@dxos/functions-runtime/ProcessManagerService')<
  ProcessManagerService,
  Manager
>() {}
