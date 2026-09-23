//
// Copyright 2026 DXOS.org
//

import { serve } from './WorkerSandboxBrowserWorker.ts';

/**
 * A ready-made Web Worker entry for hosts whose bundle needs no per-realm setup. An app that does
 * (e.g. Composer's slim Automerge) writes its own entry that calls `serve({ beforeStart })`.
 */
serve();
