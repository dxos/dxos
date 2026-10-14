//
// Copyright 2026 DXOS.org
//

import { serve } from '@dxos/agent-code-mode/browser-worker';

import { initAutomergeWasm } from '../util/automerge-wasm.ts';

// The sandbox opens its own ECHO client, and automerge is slim-resolved in this bundle, so the
// wasm must be initialized in this realm too (see util/automerge-wasm.ts).
serve({ beforeStart: initAutomergeWasm });
