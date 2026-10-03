//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';

import { initEchoHostWasm } from './automerge-wasm.ts';

// Stands in for `@dxos/client/dedicated-worker` under `slimWasmPlugin`: the echo host this worker
// runs needs the slim-resolved wasm initialized before it starts.
runDedicatedWorker({ onBeforeStart: () => initEchoHostWasm() });
