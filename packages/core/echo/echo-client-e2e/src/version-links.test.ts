//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { isDeepStrictEqual } from 'node:util';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Filter, Lens, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey } from '@dxos/keys';

import { type TestDatabase, createPartitionedPair } from './testing/partitioned-pair.ts';

//
// A struct a newer version keeps in an object of its own (`.agents/projects/lenses/DESIGN.md` §12.10): the
// host extracts it into an ordinary object the client queries and edits, and edits flow between that object
// and the older version. Objects two partitioned peers extract merge into one once they meet.
//

const Address = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(
  Schema.Struct({ line1: Schema.String, city: Schema.String }),
);
const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
);
const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
  Schema.Struct({ name: Schema.String, address: Ref.Ref(Address) }),
);
const lens = Lens.make(
  PersonV1,
  PersonV2,
  { address: Lens.extract('address', Address, { line1: 'street' }) },
  { defaults: { address: { street: '', city: '' } } },
);

const Item = Type.makeObject(DXN.make('org.dxos.test.item', '0.1.0'))(
  Schema.Struct({ sku: Schema.String, quantity: Schema.Number }),
);
const OrderV1 = Type.makeObject(DXN.make('org.dxos.test.order', '0.1.0'))(
  Schema.Struct({ items: Schema.mutable(Schema.Array(Schema.Struct({ sku: Schema.String, qty: Schema.Number }))) }),
);
const OrderV2 = Type.makeObject(DXN.make('org.dxos.test.order', '0.2.0'))(
  Schema.Struct({ items: Schema.Array(Ref.Ref(Item)) }),
);
const eachLens = Lens.make(
  OrderV1,
  OrderV2,
  { items: Lens.extractEach('items', Item, { quantity: 'qty' }) },
  { defaults: { items: [] } },
);

const ContactV1 = Type.makeObject(DXN.make('org.dxos.test.contact', '0.1.0'))(
  Schema.Struct({ name: Schema.String, address: Schema.optional(Ref.Ref(Address)) }),
);
const ContactV2 = Type.makeObject(DXN.make('org.dxos.test.contact', '0.2.0'))(
  Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
);
const absorbLens = Lens.make(ContactV1, ContactV2, { address: Lens.absorb('address', Address, { street: 'line1' }) });

/** Waits until a peer's host has synced the version documents of what its database wrote. */
const settle = async (peer: { host: { versionsSettled(): Promise<void> } }, db: TestDatabase): Promise<void> => {
  await db._repo.flush();
  await db.flush({ indexes: true });
  await peer.host.versionsSettled();
};

const addresses = (db: TestDatabase) => db.query(Filter.type(Address)).run();

type DocumentUrl = Extract<Parameters<TestDatabase['_repo']['find']>[0], string>;

const isDocumentUrl = (url: string): url is DocumentUrl => url.startsWith('automerge:');

/** The person's document for the older version, which embeds the struct. */
const olderVersion = async (db: TestDatabase, personId: string) => {
  const url = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), personId)['0.1.0'];
  invariant(url && isDocumentUrl(url), 'no older version');
  const handle = db._repo.find<DatabaseDirectory>(url);
  await handle.whenReady();
  return handle;
};

/** Whether the older version embeds `expected` as the struct. */
const embeds = async (db: TestDatabase, personId: string, expected: unknown): Promise<boolean> =>
  isDeepStrictEqual(
    JSON.parse(JSON.stringify((await olderVersion(db, personId)).doc().objects?.[personId]?.data?.address ?? null)),
    expected,
  );

describe('extracted objects across versions', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('the host extracts the struct into an object, and edits flow between it and the older version', async () => {
    const pair = await createPartitionedPair(builder, [PersonV1, PersonV2, Address]);
    network = pair.network;
    const { peer1 } = pair;
    const db = await peer1.createDatabase(PublicKey.random());
    const person = db.add(Obj.make(PersonV1, { name: 'Ada', address: { street: '1 Main', city: 'London' } }));
    await db.flush();
    db.graph.registry.add([lens]);

    let address: Awaited<ReturnType<typeof addresses>>[number] | undefined;
    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        [address] = await addresses(db);
        return address !== undefined;
      },
      interval: 100,
      timeout: 20_000,
    });
    const extracted = address;
    invariant(extracted);
    expect(Obj.getValue(extracted, ['line1'])).toBe('1 Main');
    // The person reads at the newer version, whose reference names the extracted object.
    expect(JSON.stringify(Obj.getValue(person, ['address']))).toContain(extracted.id);

    Obj.update(extracted, (extracted) => {
      extracted.city = 'Paris';
    });
    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        return embeds(db, person.id, { street: '1 Main', city: 'Paris' });
      },
      interval: 100,
      timeout: 10_000,
    });

    (await olderVersion(db, person.id)).change((doc) => {
      const data = doc.objects?.[person.id]?.data;
      invariant(data, 'no person');
      data.address.street = '2 Side';
    });
    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        return Obj.getValue(extracted, ['line1']) === '2 Side';
      },
      interval: 100,
      timeout: 10_000,
    });
    expect(await addresses(db)).toHaveLength(1);
  }, 60_000);

  test('the host extracts each element of a list, and an object deleted at the newer version takes its element', async () => {
    const pair = await createPartitionedPair(builder, [OrderV1, OrderV2, Item]);
    network = pair.network;
    const { peer1 } = pair;
    const db = await peer1.createDatabase(PublicKey.random());
    const order = db.add(
      Obj.make(OrderV1, {
        items: [
          { sku: 'a', qty: 1 },
          { sku: 'b', qty: 2 },
        ],
      }),
    );
    await db.flush();
    db.graph.registry.add([eachLens]);

    const items = () => db.query(Filter.type(Item)).run();
    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        return (await items()).length === 2;
      },
      interval: 100,
      timeout: 20_000,
    });
    const [first, second] = [...(await items())].sort((one, two) =>
      String(Obj.getValue(one, ['sku'])).localeCompare(String(Obj.getValue(two, ['sku']))),
    );
    Obj.update(second, (second) => {
      second.quantity = 5;
    });
    db.remove(first);
    const olderItems = async () =>
      JSON.parse(JSON.stringify((await olderVersion(db, order.id)).doc().objects?.[order.id]?.data?.items ?? null));
    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        return isDeepStrictEqual(await olderItems(), [{ sku: 'b', qty: 5 }]);
      },
      interval: 100,
      timeout: 10_000,
    });
    expect(await items()).toHaveLength(1);
  }, 60_000);

  test('the host absorbs a referenced object into each parent, and copies of a shared one exchange edits', async () => {
    const pair = await createPartitionedPair(builder, [ContactV1, ContactV2, Address]);
    network = pair.network;
    const { peer1 } = pair;
    const db = await peer1.createDatabase(PublicKey.random());
    const address = db.add(Obj.make(Address, { line1: '1 Main', city: 'London' }));
    const ada = db.add(Obj.make(ContactV1, { name: 'Ada', address: Ref.make(address) }));
    const grace = db.add(Obj.make(ContactV1, { name: 'Grace', address: Ref.make(address) }));
    await db.flush({ indexes: true });
    db.graph.registry.add([absorbLens]);

    const embedded = async (contactId: string): Promise<unknown> => {
      const url = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), contactId)['0.2.0'];
      if (!url || !isDocumentUrl(url)) {
        return undefined;
      }
      const handle = db._repo.find<DatabaseDirectory>(url);
      await handle.whenReady();
      return JSON.parse(JSON.stringify(handle.doc().objects?.[contactId]?.data?.address ?? null));
    };
    const both = async (expected: unknown): Promise<boolean> =>
      isDeepStrictEqual(await embedded(ada.id), expected) && isDeepStrictEqual(await embedded(grace.id), expected);

    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        return both({ street: '1 Main', city: 'London' });
      },
      interval: 100,
      timeout: 20_000,
    });

    Obj.update(address, (address) => {
      address.city = 'Paris';
    });
    const url = DatabaseDirectory.getVersionDocUrls(db._getSpaceRootDocHandle().doc(), ada.id)['0.2.0'];
    invariant(url && isDocumentUrl(url), 'no newer version');
    const adaV2 = db._repo.find<DatabaseDirectory>(url);
    await adaV2.whenReady();
    adaV2.change((doc) => {
      const data = doc.objects?.[ada.id]?.data;
      invariant(data, 'no contact');
      data.address.street = '2 Side';
    });
    await waitForCondition({
      condition: async () => {
        await settle(peer1, db);
        return (
          (await both({ street: '2 Side', city: 'Paris' })) &&
          Obj.getValue(address, ['line1']) === '2 Side' &&
          Obj.getValue(address, ['city']) === 'Paris'
        );
      },
      interval: 100,
      timeout: 10_000,
    });
  }, 60_000);

  test('objects two partitioned peers extract merge into one holding both peers’ edits', async () => {
    const pair = await createPartitionedPair(builder, [PersonV1, PersonV2, Address]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;
    const spaceKey = PublicKey.random();
    const db1 = await peer1.createDatabase(spaceKey);
    const person = db1.add(Obj.make(PersonV1, { name: 'Ada', address: { street: '1 Main', city: 'London' } }));
    await db1.flush();
    const rootUrl = db1.rootUrl;
    invariant(rootUrl);
    const db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await syncAll(db1, db2);

    await partition();
    db1.graph.registry.add([lens]);
    db2.graph.registry.add([lens]);
    const extracted: Awaited<ReturnType<typeof addresses>> = [];
    for (const [peer, db] of [
      [peer1, db1],
      [peer2, db2],
    ] as const) {
      await waitForCondition({
        condition: async () => {
          await settle(peer, db);
          return (await addresses(db)).length === 1;
        },
        interval: 100,
        timeout: 20_000,
      });
      const [address] = await addresses(db);
      extracted.push(address);
    }
    expect(extracted[0].id).not.toBe(extracted[1].id);
    const [first, second] = extracted;
    Obj.update(first, (first) => {
      first.line1 = '1 Main Street';
    });
    Obj.update(second, (second) => {
      second.city = 'Paris';
    });
    await settle(peer1, db1);
    await settle(peer2, db2);

    await heal();
    const expected = { street: '1 Main Street', city: 'Paris' };
    await waitForCondition({
      condition: async () => {
        await syncAll(db1, db2);
        await settle(peer1, db1);
        await settle(peer2, db2);
        const [live1, live2] = await Promise.all([addresses(db1), addresses(db2)]);
        return (
          live1.length === 1 &&
          live2.length === 1 &&
          live1[0].id === live2[0].id &&
          (await embeds(db1, person.id, expected)) &&
          (await embeds(db2, person.id, expected)) &&
          Obj.getValue(live1[0], ['line1']) === '1 Main Street' &&
          Obj.getValue(live2[0], ['city']) === 'Paris'
        );
      },
      interval: 200,
      timeout: 30_000,
    });
  }, 90_000);
});
