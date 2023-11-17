import { next as automerge } from '@automerge/automerge';
import { describe, test } from '@dxos/test';
import { numericalValues, range } from '@dxos/util';
import { inspect } from 'util';
import * as Y from 'yjs';


describe.only('Automerge', () => {
  const CHANGE_COUNT = 10_000;
  const PROP_COUNT = 4;

  test('example', () => {
    const diffSizes: number[] = [];

    let doc1 = automerge.init<any>();
    for (let i = 0; i < CHANGE_COUNT; i++) {
      doc1 = automerge.change(doc1, (d) => {
        for(const j of range(PROP_COUNT)) {
          d[`prop${j}`] = i + j;
        }
      });

      diffSizes.push(automerge.saveIncremental(doc1)?.length);
    }
    console.log('automerge', { CHANGE_COUNT, PROP_COUNT })
    console.log('full', automerge.save(doc1).length);
    console.log('diff', numericalValues(diffSizes, x => x));
  });

  test('yjs', () => {
    const diffSizes: number[] = [];
    const doc = new Y.Doc();
    for (let i = 0; i < CHANGE_COUNT; i++) {
      const cb = (update: any) => {
        diffSizes.push(update.length);
      };

      try {
        doc.once('updateV2', cb);
        doc.transact(() => {
          for(const j of range(PROP_COUNT)) {
            doc.getMap().set(`prop${j}`, i + j);
          }
        });
      } finally {
        doc.off('updateV2', cb);
      }
    }
    console.log('yjs', { CHANGE_COUNT, PROP_COUNT })
    console.log('full', Y.encodeStateAsUpdateV2(doc).length);
    console.log('diff', numericalValues(diffSizes, x => x));
  });

  test.skip('diff', () => {
    let doc = automerge.init<any>();
    const before = automerge.getHeads(doc);

    doc = automerge.change(doc, (d) => {
      d.text = 'foo';
    });

    const { newDoc } = automerge.changeAt(doc, before, (d) => { });
    doc = newDoc;

    const heads = automerge.getHeads(doc);
    const diff = automerge.diff(doc, heads, heads);

    console.log(diff)
  })

  test.only('repo', async () => {
    const { Repo } = await eval('import("@automerge/automerge-repo")');

    const repo = new Repo({
      network: [],
      // storage: new IndexedDBStorageAdapter(),
      sharePolicy: async (peerId: any, documentId: any) => true // this is the default
    })
    const handle = repo.create()

    handle.change((doc: any) => {
      doc.text = "hello world"

      console.log(doc.text)
    });
  })
});