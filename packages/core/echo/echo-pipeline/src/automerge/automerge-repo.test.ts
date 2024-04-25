//
// Copyright 2024 DXOS.org
//

import { Repo } from '@dxos/automerge/automerge-repo';
import { randomBytes } from '@dxos/crypto';
import { describe, openAndClose, test } from '@dxos/test';

import { LevelDBStorageAdapter } from './leveldb-storage-adapter';
import { createTestLevel } from '../testing';

describe('AutomergeRepo', () => {
  // Currently failing
  test('flush', async () => {
    const level = createTestLevel();
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);

    const repo = new Repo({
      network: [],
      storage,
    });
    const handle = repo.create<{ field?: string }>();

    for (let i = 0; i < 10; i++) {
      const p = repo.flush([handle.documentId]);
      handle.change((doc: any) => {
        doc.field += randomBytes(1024).toString('hex');
      });
      await p;
    }
  });

  test('getChangeByHash', async () => {});
});
