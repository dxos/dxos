//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { IndexMetadataStore } from '@dxos/indexing';
import { createTestLevel } from '@dxos/kv-store/testing';
import { afterTest, describe, test } from '@dxos/test';

import { AutomergeHost } from './automerge-host';

describe('AutomergeHost', () => {
  test('can create documents', async () => {
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());
    const host = new AutomergeHost({
      db: level.sublevel('automerge'),
      indexMetadataStore: new IndexMetadataStore({ db: level.sublevel('index-metadata') }),
    });
    await host.open();
    afterTest(() => host.close());

    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    await host.repo.flush();
    expect(handle.docSync().text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async () => {
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const host = new AutomergeHost({
      db: level.sublevel('automerge'),
      indexMetadataStore: new IndexMetadataStore({ db: level.sublevel('index-metadata') }),
    });
    await host.open();
    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    await host.repo.flush();
    await host.close();

    const host2 = new AutomergeHost({
      db: level.sublevel('automerge'),
      indexMetadataStore: new IndexMetadataStore({ db: level.sublevel('index-metadata') }),
    });
    await host2.open();
    afterTest(() => host2.close());
    const handle2 = host2.repo.find(url);
    await handle2.whenReady();
    expect(handle2.docSync().text).toEqual('Hello world');
    await host2.repo.flush();
  });
});
