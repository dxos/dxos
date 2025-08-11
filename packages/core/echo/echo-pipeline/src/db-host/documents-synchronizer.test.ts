//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { Repo, generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { openAndClose } from '@dxos/test-utils';

import { DocumentsSynchronizer } from './documents-synchronizer';

describe('DocumentsSynchronizer', () => {
  test('do not get init changes for client created docs', async () => {
    let counter = 0;
    const serverRepo = new Repo({ network: [] });
    const synchronizer = new DocumentsSynchronizer({
      repo: serverRepo,
      sendUpdates: () => {
        counter++;
      },
    });
    await openAndClose(synchronizer);

    await synchronizer.update([
      {
        documentId: parseAutomergeUrl(generateAutomergeUrl()).documentId,
        mutation: A.save(A.from({ text: 'hello' })),
        isNew: true,
      },
    ]);

    // Wait for the changes to be processed.
    await sleep(100);

    // No updates should be sent.
    expect(counter).to.eq(0);
  });
});
