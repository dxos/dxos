//
// Copyright 2026 DXOS.org
//

// Log-writer worker entry — construct with `new Worker(...)`/`new SharedWorker(...)` and hand
// it (or its port) to `WorkerLogStore`. Apps bundling their own worker wrapper instead import
// `runLogWriterWorker` from the package root.

import { runLogWriterWorker } from './log-writer';

runLogWriterWorker();
