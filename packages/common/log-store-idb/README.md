# @dxos/log-store-idb

IndexedDB-backed log store for [`@dxos/log`](../log).

Buffers `@dxos/log` entries in memory, encodes them as JSONL and flushes batches
to IndexedDB. Supports concurrent writes from multiple browsing contexts (each
tab opens its own connection — IDB serializes transactions). Eviction is
deduplicated across tabs via the Web Locks API.

## Usage

```ts
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';

const store = new IdbLogStore({
  dbName: 'my-app-logs',
  flushInterval: 300,
  maxRecords: 5_000,
});

log.addProcessor(store.processor);

// Later — for example when attaching logs to a feedback report:
const jsonl = await store.export({ maxSize: 20 * 1024 * 1024 }); // bytes
```

`export({ maxSize })` keeps the newest log lines and drops the oldest. Lines are
never split — the result is always a sequence of complete JSONL records joined
by `\n`.

## Worker-backed writes

`IdbLogStore` flushes from the calling thread, so persistence depends on that
thread's event loop turning — a long synchronous task starves the flush and the
buffered lines are lost if the tab crashes. `WorkerLogStore` instead posts each
pre-serialized line to a log-writer worker, which owns the queue, flush timer,
chunked IDB writes and eviction; the worker keeps persisting while the sender is
blocked. Filtering and serialization stay on the calling thread (log entries are
not reliably structured-cloneable).

```ts
// my-app/log-writer-worker.ts — the worker entry.
import { runLogWriterWorker } from '@dxos/log-store-idb';
runLogWriterWorker();
```

```ts
import { log } from '@dxos/log';
import { WorkerLogStore } from '@dxos/log-store-idb';

// Prefer a SharedWorker (consolidates multi-tab writers, survives a tab close);
// pass a dedicated Worker where SharedWorker is unavailable.
const worker = new SharedWorker(new URL('./log-writer-worker', import.meta.url), { type: 'module' });
const store = new WorkerLogStore({ dbName: 'my-app-logs', worker: worker.port });

log.addProcessor(store.processor);
```

Both stores implement the `LogStore` interface (`processor`, `flush`, `export`,
`exportBlob`, `clear`, `close`) and write the same chunk format, so read paths
can open the database with either.
