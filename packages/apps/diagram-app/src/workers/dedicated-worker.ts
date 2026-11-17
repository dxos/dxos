//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';
import { log } from '@dxos/log';

import { initEchoHostWasm } from '../automerge-wasm.ts';

// Started at evaluation so the wasm compiles while the tab boots; `onBeforeStart` awaits the same init.
void initEchoHostWasm().catch((err) => log.verbose('early wasm init failed; retried on start', { err }));

runDedicatedWorker({ onBeforeStart: () => initEchoHostWasm() });
