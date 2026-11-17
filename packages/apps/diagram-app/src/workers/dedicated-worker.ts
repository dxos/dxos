//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';
import { log } from '@dxos/log';

import { initEchoHostWasm } from '../automerge-wasm.ts';

void initEchoHostWasm().catch((err) => log.verbose('early wasm init failed; retried on start', { err }));

runDedicatedWorker({ onBeforeStart: () => initEchoHostWasm() });
