//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { Annotation, Filter, Obj, Ref } from '@dxos/echo';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { TestSchema } from '@dxos/echo/testing';
import { EID, EntityId, PublicKey } from '@dxos/keys';

import { EchoTestBuilder } from '../testing/index.ts';

const CollapsedAnnotation = Annotation.make({
  id: 'org.dxos.annotation.test-collapsed',
  schema: Schema.Boolean,
  storage: 'device',
});

const ScrollAnnotation = Annotation.make({
  id: 'org.dxos.annotation.test-scroll',
  schema: Schema.Struct({ top: Schema.Number }),
  storage: 'device',
});

describe('device-scoped annotations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('identity storage is reserved', ({ expect }) => {
    expect(() =>
      Annotation.make({ id: 'org.dxos.annotation.test-identity', schema: Schema.String, storage: 'identity' }),
    ).toThrow();
  });

  test('a value is readable at once and never enters the document', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const object = db.add(Obj.make(TestSchema.Expando, { title: 'a' }));

    Obj.update(object, (object) => Annotation.set(object, CollapsedAnnotation, true));
    expect(Annotation.get(object, CollapsedAnnotation)).toEqual(Option.some(true));
    expect(CollapsedAnnotation.key in Obj.getMeta(object).annotations).toBe(false);
    expect(JSON.stringify(Obj.toJSON(object))).not.toContain(CollapsedAnnotation.key);

    Annotation.update(object, ScrollAnnotation, () => {});
    expect(Annotation.get(object, ScrollAnnotation)).toEqual(Option.none());
    Obj.update(object, (object) => Annotation.set(object, ScrollAnnotation, { top: 1 }));
    Annotation.update(object, ScrollAnnotation, (value) => {
      value.top = 2;
    });
    expect(Annotation.get(object, ScrollAnnotation)).toEqual(Option.some({ top: 2 }));
  });

  test('a value written before the object joins a database carries over', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const object = Obj.make(TestSchema.Expando, { title: 'a' });
    Obj.update(object, (object) => Annotation.set(object, CollapsedAnnotation, true));
    db.add(object);
    expect(Annotation.get(object, CollapsedAnnotation)).toEqual(Option.some(true));
  });

  test('another client on the same device sees the value with the object, and live', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db1 = await peer.createDatabase(spaceKey);
    const object = db1.add(Obj.make(TestSchema.Expando, { title: 'a' }));
    Obj.update(object, (object) => Annotation.set(object, CollapsedAnnotation, true));
    await db1.flush();

    const client2 = await peer.createClient();
    const db2 = await peer.openDatabase(spaceKey, db1.rootUrl, { client: client2 });
    const object2 = await db2.makeRef(Obj.getURI(object)).load();
    await expect.poll(() => Annotation.get(object2, CollapsedAnnotation)).toEqual(Option.some(true));

    // A later write reaches the other client without a document change.
    Obj.update(object, (object) => Annotation.set(object, CollapsedAnnotation, false));
    await db1.flush();
    await expect.poll(() => Annotation.get(object2, CollapsedAnnotation)).toEqual(Option.some(false));
  });

  test('queries match device values, in the working set and through the index', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db1 = await peer.createDatabase(spaceKey);
    const collapsed = db1.add(Obj.make(TestSchema.Expando, { title: 'collapsed' }));
    db1.add(Obj.make(TestSchema.Expando, { title: 'expanded' }));
    Obj.update(collapsed, (collapsed) => Annotation.set(collapsed, CollapsedAnnotation, true));
    await db1.flush({ indexes: true });

    expect((await db1.query(Filter.annotation(CollapsedAnnotation, true)).run()).map((object) => object.id)).toEqual([
      collapsed.id,
    ]);

    // A second client holds nothing in its working set, so only the host index can answer.
    const client2 = await peer.createClient();
    const db2 = await peer.openDatabase(spaceKey, db1.rootUrl, { client: client2 });
    await expect
      .poll(async () =>
        (await db2.query(Filter.annotation(CollapsedAnnotation, true)).run()).map((object) => object.id),
      )
      .toEqual([collapsed.id]);
    expect(await db2.query(Filter.annotation(CollapsedAnnotation, false)).run()).toEqual([]);
  });

  test('values stay on the device that wrote them', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer({ types: [TestSchema.Expando] });
    await using peer2 = await builder.createPeer({ types: [TestSchema.Expando] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    const db1 = await peer1.createDatabase(spaceKey);
    const object = db1.add(Obj.make(TestSchema.Expando, { title: 'a' }));
    Obj.update(object, (object) => Annotation.set(object, CollapsedAnnotation, true));
    await db1.flush();

    const heads = await db1.getDocumentHeads();
    const db2 = await peer2.openDatabase(spaceKey, db1.rootUrl);
    await db2.waitUntilHeadsReplicated(heads);
    const object2 = await db2.makeRef(Obj.getURI(object)).load();
    expect(object2.title).toBe('a');
    expect(Annotation.get(object2, CollapsedAnnotation)).toEqual(Option.none());

    // Each device keeps its own value.
    Obj.update(object2, (object2) => Annotation.set(object2, CollapsedAnnotation, false));
    await db2.flush();
    expect(Annotation.get(object, CollapsedAnnotation)).toEqual(Option.some(true));
    expect(Annotation.get(object2, CollapsedAnnotation)).toEqual(Option.some(false));
  });
});

describe('Ref.hint', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('reports a loaded target from the working set', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const target = db.add(Obj.make(TestSchema.Expando, { title: 'target' }));
    const source = db.add(Obj.make(TestSchema.Expando, { title: 'source', ref: Ref.make(target) }));
    expect(source.ref.hint).toBe('available');

    db.remove(target);
    expect(source.ref.hint).toBe('deleted');
  });

  test('reports targets the index knows, delivered with the holding object', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db1 = await peer.createDatabase(spaceKey);
    const live = db1.add(Obj.make(TestSchema.Expando, { title: 'live' }));
    const deleted = db1.add(Obj.make(TestSchema.Expando, { title: 'deleted' }));
    const source = db1.add(
      Obj.make(TestSchema.Expando, {
        title: 'source',
        live: Ref.make(live),
        deleted: Ref.make(deleted),
        dangling: Ref.fromURI(EID.make({ entityId: EntityId.random() })),
      }),
    );
    db1.remove(deleted);
    await db1.flush({ indexes: true });

    // A second client loads only the holding object: its targets are not in the working set.
    const client2 = await peer.createClient();
    const db2 = await peer.openDatabase(spaceKey, db1.rootUrl, { client: client2 });
    const source2 = await db2.makeRef(Obj.getURI(source)).load();
    await expect
      .poll(() => [source2.live.hint, source2.deleted.hint, source2.dangling.hint])
      .toEqual(['available', 'deleted', 'dangling']);
  });

  test('a dangling target becomes available once indexed', async ({ expect }) => {
    const spaceKey = PublicKey.random();
    await using peer = await builder.createPeer({ types: [TestSchema.Expando] });
    const db1 = await peer.createDatabase(spaceKey);
    const targetId = EntityId.random();
    const source = db1.add(
      Obj.make(TestSchema.Expando, { title: 'source', target: Ref.fromURI(EID.make({ entityId: targetId })) }),
    );
    await db1.flush({ indexes: true });

    const client2 = await peer.createClient();
    const db2 = await peer.openDatabase(spaceKey, db1.rootUrl, { client: client2 });
    const source2 = await db2.makeRef(Obj.getURI(source)).load();
    await expect.poll(() => source2.target.hint).toBe('dangling');

    // Created with the id the reference already names.
    db1.add(Obj.make(TestSchema.Expando, { id: targetId, title: 'target' }));
    await db1.flush({ indexes: true });
    await expect.poll(() => source2.target.hint).toBe('available');
  });
});
