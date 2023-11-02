import * as automerge from '@automerge/automerge';
import { describe, test } from '@dxos/test';
import { inspect } from 'util';
import * as Y from 'yjs';

describe.only('Automerge', () => {
  test('example', () => {
    type DocType = { a: number };

    for (let i = 0; i < 10; i++) {
      let doc1 = automerge.init<DocType>();
      doc1 = automerge.change(doc1, (d) => {
        d.a = i;
      });

      console.log(automerge.getLastLocalChange(doc1)?.length);
    }
  });

  test('yjs', () => {
    const doc = new Y.Doc();
    for (let i = 0; i < 10; i++) {
      const cb = (update: any) => {
        console.log(update.length);
      };

      try {
        doc.once('updateV2', cb);
        doc.transact(() => {
          doc.getMap().set('a', i);
        });
      } finally {
        doc.off('updateV2', cb);
      }
    }
  });
});
