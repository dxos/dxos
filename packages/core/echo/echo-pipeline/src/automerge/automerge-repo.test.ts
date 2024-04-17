import { Repo } from '@dxos/automerge/automerge-repo';
import { randomBytes } from '@dxos/crypto';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { describe, test } from '@dxos/test';
import { AutomergeStorageAdapter } from './automerge-storage-adapter';

describe('AutomergeRepo', () => {
  // Currently failing
  test.skip('flush', async () => {
    const repo = new Repo({
      network: [],
      storage: new AutomergeStorageAdapter(createStorage({ type: StorageType.NODE }).createDirectory()),
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
});
