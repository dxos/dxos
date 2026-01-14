//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { IndexMetadataStore } from '@dxos/indexing';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { AutomergeHost } from '../automerge';

import { DocumentsSynchronizer } from './documents-synchronizer';

describe('DocumentsSynchronizer', () => {
  test('do not get init changes for client created docs', async () => {
    let counter = 0;
    const kv = createTestLevel();
    const host = new AutomergeHost({
      db: kv,
      indexMetadataStore: new IndexMetadataStore({ db: kv.sublevel('index-metadata') }),
    });
    await openAndClose(host);
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: () => {
        counter++;
      },
    });
    await openAndClose(synchronizer);

    await synchronizer.update([
      {
        documentId: parseAutomergeUrl(generateAutomergeUrl()).documentId,
        mutation: A.save(A.from({ text: 'hello' })),
      },
    ]);

    // Wait for the changes to be processed.
    await sleep(100);

    // No updates should be sent.
    expect(counter).to.eq(0);
  });
});
