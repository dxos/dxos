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
