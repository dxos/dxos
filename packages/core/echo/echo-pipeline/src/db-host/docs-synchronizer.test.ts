//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl, Repo } from '@dxos/automerge/automerge-repo';
import { describe, openAndClose, test } from '@dxos/test';

import { DocsSynchronizer } from './docs-synchronizer';

describe('DocsSynchronizer', () => {
  test('do not get init changes for client created docs', async () => {
    let counter = 0;
    const serverRepo = new Repo({ network: [] });
    const synchronizer = new DocsSynchronizer({
      repo: serverRepo,
      sendUpdates: () => {
        counter++;
      },
    });
    await openAndClose(synchronizer);

    synchronizer.write([
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
