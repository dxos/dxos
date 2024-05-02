//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { change, clone, from, getBackend, getHeads } from '@dxos/automerge/automerge';
import { Repo } from '@dxos/automerge/automerge-repo';
import { randomBytes } from '@dxos/crypto';
import { describe, openAndClose, test } from '@dxos/test';

import { LevelDBStorageAdapter } from './leveldb-storage-adapter';
import { createTestLevel } from '@dxos/kv-store/testing';

describe('AutomergeRepo', () => {
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

  test('getChangeByHash', async () => {
    const level = createTestLevel();
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);

    const doc = from({ foo: 'bar' });
    const copy = clone(doc);
    const newDoc = change(copy, 'change', (doc: any) => {
      doc.foo = 'baz';
    });

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(newDoc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.not.be.null;
    }

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(doc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.be.null;
    }
  });
});
