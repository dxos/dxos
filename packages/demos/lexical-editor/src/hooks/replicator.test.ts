//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';
import { applyUpdate, Doc } from 'yjs';

import { Replicator } from './replicator';

describe('YJS sync', () => {
  test('YJS updates', async () => {
    let count = 0;
    const docs = Array.from({ length: 3 }).map(() => {
      const doc = new Doc();

      // https://docs.yjs.dev/api/document-updates
      doc.on('update', (update: Uint8Array, origin: any, doc: Doc) => {
        const clientId = doc.clientID;
        docs.forEach(doc => {
          if (doc.clientID !== clientId) {
            applyUpdate(doc, update);
            count++;
          }
        });
      });

      return doc;
    });

    // Update in parallel.
    docs[0].getText().insert(0, 'World!');
    docs[1].getText().insert(0, 'Hello');
    docs[2].getText().insert(5, ' ');

    const expected = 'Hello World!';
    await waitForExpect(() => {
      const match = docs.every(doc => doc.getText().toString() === expected);
      expect(match).toBeTruthy();
    });

    console.log(count); // TODO(burdon): 18!
  });

  // TODO(burdon): Use TextModel (which has embedded Doc). Delete replicator.
  test('TextModel', () => {
    const replicator = new Replicator();
    const { model: model1 } = replicator.createPeer('peer-1');
    const { model: model2 } = replicator.createPeer('peer-2');
    expect(model1.doc.clientID).not.toEqual(model2.doc.clientID);

    // https://docs.yjs.dev/api/delta-format
    // https://docs.yjs.dev/api/document-updates
    // https://docs.yjs.dev/api/shared-types/y.text

    // {
    //   const text = model2.doc.getText();
    //   text.applyDelta(delta);
    //   text.insert(6, 'World');
    //   delta = text.toDelta();
    //   console.log(delta);
    // }
    //
    // {
    //   const text = model1.doc.getText();
    //   text.applyDelta(delta);
    //   console.log(text.toString());
    // }
  });
});
