//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Repo } from '@dxos/automerge/automerge-repo';
import { describe, openAndClose, test } from '@dxos/test';

import { DocsSynchronizer } from './docs-synchronizer';

describe('DocsSynchronizer', () => {
  test('do not get init changes for client created docs', async () => {
    let counter = 0;
    const serverRepo = new Repo({ network: [] });
    const synchronizer = new DocsSynchronizer({
      repo: serverRepo,
      sendUpdates: (updates) => {
        counter++;
      },
    });
    await openAndClose(synchronizer);

    const doc = serverRepo.create<{ text: string }>();
    await synchronizer.addDocuments([doc.documentId]);

    // No updates should be sent.
    expect(counter).to.eq(0);
  });
});
