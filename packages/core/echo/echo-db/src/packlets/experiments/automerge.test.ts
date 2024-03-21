//
// Copyright 2023 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Y from 'yjs';

import { describe, test } from '@dxos/test';
import { numericalValues, range } from '@dxos/util';

describe('Automerge', () => {
  const CHANGE_COUNT = 10_000;
  const PROP_COUNT = 4;

  test.skip('example', () => {
    const diffSizes: number[] = [];

    let doc1 = A.init<any>();
    for (let i = 0; i < CHANGE_COUNT; i++) {
      doc1 = A.change(doc1, (d) => {
        for (const j of range(PROP_COUNT)) {
          d[`prop${j}`] = i + j;
        }
      });

      diffSizes.push(A.saveIncremental(doc1)?.length);
    }
    console.log('automerge', { CHANGE_COUNT, PROP_COUNT });
    console.log('full', A.save(doc1).length);
    console.log(
      'diff',
      numericalValues(diffSizes, (x) => x),
    );
  });

  test.skip('yjs', () => {
    const diffSizes: number[] = [];
    const doc = new Y.Doc();
    for (let i = 0; i < CHANGE_COUNT; i++) {
      const cb = (update: any) => {
        diffSizes.push(update.length);
      };

      try {
        doc.once('updateV2', cb);
        doc.transact(() => {
          for (const j of range(PROP_COUNT)) {
            doc.getMap().set(`prop${j}`, i + j);
          }
        });
      } finally {
        doc.off('updateV2', cb);
      }
    }
    console.log('yjs', { CHANGE_COUNT, PROP_COUNT });
    console.log('full', Y.encodeStateAsUpdateV2(doc).length);
    console.log(
      'diff',
      numericalValues(diffSizes, (x) => x),
    );
  });

  test.skip('diff', () => {
    let doc = A.init<any>();
    const before = A.getHeads(doc);

    doc = A.change(doc, (d) => {
      d.text = 'foo';
    });

    const { newDoc } = A.changeAt(doc, before, (d) => {});
    doc = newDoc;

    const heads = A.getHeads(doc);
    const diff = A.diff(doc, heads, heads);
    console.log(diff);
  });

  test('repo', async () => {
    // eslint-disable-next-line no-eval
    const { Repo } = await eval('import("@automerge/automerge-repo")');

    const repo = new Repo({
      network: [],
      // storage: new IndexedDBStorageAdapter(),
      sharePolicy: async (peerId: any, documentId: any) => true, // this is the default
    });

    const handle = repo.create();
    handle.change((doc: any) => {
      doc.text = 'hello world';
      // console.log(doc.text);
    });
  });
});
