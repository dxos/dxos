//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';

// Direct module import: the util barrel would pull the whole config/observability graph into
// this worker's bundle.
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES } from '../util/constants';
import { type LogWriterMessage } from '../util/worker-log-processor';

// Log-writer worker: owns the queue, flush timer, chunked IDB writes and eviction, so log
// persistence never depends on the sending thread's event loop turning (see DX-1224).
// `WorkerLogProcessor` is the sending side.

const store = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });

globalThis.onmessage = (event: MessageEvent<LogWriterMessage>): void => {
  const data = event.data;
  // Hot path: a bare string is one pre-serialized JSONL line.
  if (typeof data === 'string') {
    store.append(data);
  } else if (data != null && data.type === 'flush') {
    // Fire-and-forget, mirroring the sender's pagehide semantics; `flush` never rejects.
    void store.flush();
  }
};
