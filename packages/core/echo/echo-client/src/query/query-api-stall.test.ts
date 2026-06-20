//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { openAndClose } from '@dxos/test-utils';

import { EchoTestBuilder, createTmpPath } from '../testing';

// Reproduces the user-visible symptom of the bug investigated in
// composer-logs-2026-05-15T13-18-07.ndjson via a deterministic harness
// using `DataServiceImpl.setAllSubscriptionsSendUpdatesPaused`. While
// paused, the worker accepts new `addDocuments` calls but never flushes
// document state to the client, so client `RepoProxy.find()` handles stay
// `pending`. Any query path that needs to load a document
// (SpaceQuerySource → batchLoadObjectCores; IndexQuerySource → ObjectLoader
// → loadObjectCoreById) waits forever on `_updateEvent`.
describe('Query API stalls under paused document synchronizer', () => {
  test('db.query(Filter.id(...)).run() hangs while the document synchronizer is paused', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const tmpPath = createTmpPath();
    const peer = await testBuilder.createPeer({ storagePath: tmpPath });

    // 1. Add an object normally so it ends up persisted on disk and
    //    discoverable via space root links.
    const db1 = await peer.createDatabase();
    const obj = db1.add(Obj.make(TestSchema.Expando, { title: 'subject' }));
    await db1.flush();
    const objId = obj.id;

    // 2. Reload to clear in-memory client state. Disk (and indexed entries)
    //    persists.
    await peer.reload();
    const db2 = await peer.openLastDatabase();

    // 3. Sanity: with the synchronizer running, the query resolves quickly.
    //    This rules out unrelated test-environment flakes.
    const baseline = await db2.query(Filter.id(objId)).run({ timeout: 1_000 });
    expect(baseline).toHaveLength(1);

    // 4. Reload again to put the linked doc back in the not-loaded-on-client
    //    state, then pause document updates from worker -> client. From now
    //    on the client RepoProxy.find() handles created during query loading
    //    stay `pending`.
    await peer.reload();
    const db3 = await peer.openLastDatabase();
    peer.host.dataService.setAllSubscriptionsSendUpdatesPaused(true);

    // 5. Run a query that needs to load the object's linked document. The
    //    load hits `RepoProxy.find()` which queues addIds through the
    //    (paused) synchronizer; no document state ever reaches the client,
    //    so the loader's `_updateEvent` never fires for objId.
    let resolved = false;
    void db3
      .query(Filter.id(objId))
      .run()
      .then(() => {
        resolved = true;
      });

    // 6. The query must NOT resolve within a generous window.
    await sleep(500);
    expect(resolved).toBe(false);

    // 7. Sanity: resuming the synchronizer flushes pending document updates
    //    and the previously-stuck query completes.
    peer.host.dataService.setAllSubscriptionsSendUpdatesPaused(false);
    await expect.poll(() => resolved, { timeout: 5_000 }).toBe(true);
  });
});
