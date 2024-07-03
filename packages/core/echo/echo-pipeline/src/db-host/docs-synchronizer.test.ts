//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Repo, generateAutomergeUrl, parseAutomergeUrl } from '@dxos/automerge/automerge-repo';
import { describe, openAndClose, test } from '@dxos/test';

import { DocsSynchronizer } from './docs-synchronizer';

describe('DocsSynchronizer', () => {
  test('do not get init changes for client created docs', async () => {
    let counter = 0;
    const synchronizer = new DocsSynchronizer({
      sendUpdates: (updates) => {
        counter++;
      },
    });
    await openAndClose(synchronizer);

    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());

    const serverRepo = new Repo({ network: [] });
    const handle = serverRepo.find(documentId);
    synchronizer.addDocuments([handle]);

    // No updates should be sent.
    expect(counter).to.eq(0);
  });
});
