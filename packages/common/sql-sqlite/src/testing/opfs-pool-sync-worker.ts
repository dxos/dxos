//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import { OPFS_SQLITE_DB_FILENAME } from '../opfs-pool-async';
import { writePoolSqlitePayload } from '../opfs-pool-sync';

type PoolWorkerMessage = ['write', id: number, data: Uint8Array] | ['close'];

self.addEventListener('message', (event: MessageEvent<PoolWorkerMessage>) => {
  const message = event.data;
  void (async () => {
    try {
      if (message[0] === 'close') {
        self.close();
        return;
      }

      const [, id, data] = message;
      const payload = new Uint8Array(data.byteLength);
      payload.set(data);
      await writePoolSqlitePayload(OPFS_SQLITE_DB_FILENAME, payload);
      self.postMessage([id, undefined, undefined]);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      self.postMessage([message[0] === 'write' ? message[1] : -1, text, undefined]);
    }
  })();
});

self.postMessage(['ready', undefined, undefined]);
