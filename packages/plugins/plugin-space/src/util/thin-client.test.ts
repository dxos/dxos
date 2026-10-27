//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Obj, Ref } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';
import { type SharedDocument, type SharedObject } from '@dxos/protocols';
import { Text } from '@dxos/schema';

import { ThinClient } from './thin-client.ts';

describe('ThinClient', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('serves the handed-over objects, resolving references among them, and nothing else', async ({ expect }) => {
    const types = [Collection.Collection, Text.Text];
    const { db, key } = await builder.createDatabase({ types });
    const body = db.add(Text.make({ content: '# Pricing' }));
    const shared = db.add(Collection.make({ name: 'Pricing notes', objects: [Ref.make(body)] }));
    const unshared = db.add(Text.make({ content: 'Notes for the team only.' }));
    await db.flush();

    const objects = [shared, body].map(sharedObject);
    // The unshared object's document is handed over too, which shows that the root, not the store, bounds the client.
    const documents = [shared, body, unshared].map(sharedDocument);
    const client = new ThinClient({ spaceId: db.spaceId, spaceKey: key, objects, documents, types });
    await client.open();
    try {
      const loaded = await client.load(shared.id);
      invariant(Obj.instanceOf(Collection.Collection, loaded));
      expect(loaded.name).toBe('Pricing notes');
      const [ref] = loaded.objects;
      expect(await ref.load()).toMatchObject({ content: '# Pricing' });
      expect(await client.load(unshared.id)).toBeUndefined();
    } finally {
      await client.close();
    }
  });
});

const documentOf = (object: Obj.Unknown) => {
  const handle = getObjectCore(object).docHandle;
  invariant(handle?.documentId, 'object has no document');
  return { documentId: handle.documentId, doc: handle.doc() };
};

const sharedObject = (object: Obj.Unknown): SharedObject => ({
  id: object.id,
  documentId: documentOf(object).documentId,
  heads: [],
});

const sharedDocument = (object: Obj.Unknown): SharedDocument => {
  const { documentId, doc } = documentOf(object);
  return { documentId, data: btoa(Array.from(A.save(doc), (byte) => String.fromCharCode(byte)).join('')) };
};
