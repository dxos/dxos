//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { generateAutomergeUrl } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Lens, Ref, Type } from '@dxos/echo';
import { DatabaseDirectory, EncodedReference, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EID, EntityId } from '@dxos/keys';

import { type VersionDocHandle, type VersionStore, syncVersionDocuments } from './version-runner.ts';
import { type VersionDoc } from './version-translation.ts';

const TYPENAME = 'org.dxos.test.task';
const OBJECT_ID = '01J00000000000000000000000';

const TaskV1 = Type.makeObject(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({ title: Schema.String, tags: Schema.Array(Schema.String) }),
);
const TaskV2 = Type.makeObject(DXN.make(TYPENAME, '0.2.0'))(
  Schema.Struct({ name: Schema.String, tags: Schema.Array(Schema.String), done: Schema.Boolean }),
);

const edgeOf = (done: boolean) =>
  Lens.versionEdge(Lens.make(TaskV1, TaskV2, { name: 'title' }, { defaults: { done } }));

const freshActor = (): string => crypto.randomUUID().replaceAll('-', '');

/** Version documents in memory, as a host's repo holds them. */
class MemoryStore implements VersionStore {
  readonly root: VersionDocHandle;

  private constructor(
    readonly docs: Map<string, VersionDoc>,
    rootUrl: string,
  ) {
    this.root = this.#handle(rootUrl);
  }

  static make(objectData: Record<string, unknown>, type: Type.AnyObj = TaskV1): MemoryStore {
    const docs = new Map<string, VersionDoc>();
    const origin = generateAutomergeUrl();
    docs.set(
      origin,
      A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.version = SpaceDocVersion.CURRENT;
        draft.objects = {
          [OBJECT_ID]: {
            system: { kind: 'object', type: EncodedReference.fromURI(Type.getURI(type)) },
            meta: { keys: [] },
            data: objectData,
          },
        };
      }),
    );
    const root = generateAutomergeUrl();
    docs.set(
      root,
      A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.version = SpaceDocVersion.CURRENT;
        draft.links = { [OBJECT_ID]: new A.RawString(origin) };
      }),
    );
    return new MemoryStore(docs, root);
  }

  /** The same documents on a second device, which edits under actors of its own. */
  fork(): MemoryStore {
    const url = this.root.url;
    invariant(url, 'no root url');
    return new MemoryStore(new Map([...this.docs].map(([url, doc]) => [url, A.clone(doc, freshActor())])), url);
  }

  /** Replicates every document both ways between two devices. */
  exchange(other: MemoryStore): void {
    for (const url of new Set([...this.docs.keys(), ...other.docs.keys()])) {
      const mine = this.docs.get(url);
      const theirs = other.docs.get(url);
      if (mine && theirs) {
        this.docs.set(url, A.merge(A.clone(mine), theirs));
        other.docs.set(url, A.merge(A.clone(theirs), mine));
      } else if (mine) {
        other.docs.set(url, A.clone(mine, freshActor()));
      } else if (theirs) {
        this.docs.set(url, A.clone(theirs, freshActor()));
      }
    }
  }

  async load(url: string): Promise<VersionDocHandle> {
    return this.#handle(url);
  }

  link(objectId: string): string | undefined {
    return this.root.doc().links?.[objectId]?.toString();
  }

  async create(doc: VersionDoc): Promise<VersionDocHandle> {
    const url = generateAutomergeUrl();
    this.docs.set(url, doc);
    return this.#handle(url);
  }

  /** Heads of every document, so a pass that writes nothing leaves this unchanged. */
  state(): string {
    return [...this.docs]
      .map(([url, doc]) => `${url}:${A.getHeads(doc).join(',')}`)
      .sort()
      .join('\n');
  }

  /** Changes the object's data in the document recorded for `version`. */
  edit(version: string, callback: (data: any) => void): void {
    const url = DatabaseDirectory.getVersionDocUrls(this.root.doc(), OBJECT_ID)[version];
    invariant(url, `no ${version}`);
    this.#handle(url).change((doc) => {
      const data = doc.objects?.[OBJECT_ID]?.data;
      invariant(data, 'no object');
      callback(data);
    });
  }

  dataAt(version: string): EntityStructure['data'] | undefined {
    const url = DatabaseDirectory.getVersionDocUrls(this.root.doc(), OBJECT_ID)[version];
    const doc = url && this.docs.get(url);
    return doc ? JSON.parse(JSON.stringify(doc.objects?.[OBJECT_ID]?.data)) : undefined;
  }

  /** Changes the entry of an object linked from the space root. */
  editObject(objectId: string, callback: (entity: EntityStructure) => void): void {
    const url = this.root.doc().links?.[objectId];
    invariant(url, `no object ${objectId}`);
    this.#handle(url.toString()).change((doc) => {
      const entity = doc.objects?.[objectId];
      invariant(entity, 'no object');
      callback(entity);
    });
  }

  /** Stores a new object in a document of its own, linked from the space root. */
  addObject(objectId: string, type: Type.AnyObj, data: Record<string, unknown>): void {
    const url = generateAutomergeUrl();
    this.docs.set(
      url,
      A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.version = SpaceDocVersion.CURRENT;
        draft.objects = {
          [objectId]: {
            system: { kind: 'object', type: EncodedReference.fromURI(Type.getURI(type)) },
            meta: { keys: [] },
            data,
          },
        };
      }),
    );
    this.root.change((root) => {
      root.links ??= {};
      root.links[objectId] = new A.RawString(url);
    });
  }

  /** The objects whose linked documents reference `objectId`, as the index reports them. */
  async referrers(objectId: string): Promise<readonly string[]> {
    return Object.keys(this.root.doc().links ?? {}).filter((id) =>
      JSON.stringify(this.object(id)?.data ?? {}).includes(`${objectId}"`),
    );
  }

  /** Changes object `objectId`'s data in the document recorded for `version`. */
  editVersion(objectId: string, version: string, callback: (data: EntityStructure['data']) => void): void {
    const url = DatabaseDirectory.getVersionDocUrls(this.root.doc(), objectId)[version];
    invariant(url, `no ${version}`);
    this.#handle(url).change((doc) => {
      const data = doc.objects?.[objectId]?.data;
      invariant(data, 'no object');
      callback(data);
    });
  }

  /** Object `objectId`'s data in the document recorded for `version`. */
  dataOf(objectId: string, version: string): EntityStructure['data'] | undefined {
    const url = DatabaseDirectory.getVersionDocUrls(this.root.doc(), objectId)[version];
    const doc = url && this.docs.get(url);
    return doc ? JSON.parse(JSON.stringify(doc.objects?.[objectId]?.data)) : undefined;
  }

  /** The entry of an object linked from the space root, as plain values. */
  object(objectId: string): EntityStructure | undefined {
    const url = this.root.doc().links?.[objectId];
    const doc = url && this.docs.get(url.toString());
    return doc ? JSON.parse(JSON.stringify(doc.objects?.[objectId])) : undefined;
  }

  #handle(url: string): VersionDocHandle {
    const read = (): VersionDoc => {
      const doc = this.docs.get(url);
      invariant(doc, `no document ${url}`);
      return doc;
    };
    return {
      url,
      doc: read,
      change: (callback, options = {}) => this.docs.set(url, A.change(read(), options, callback)),
      update: (callback) => this.docs.set(url, callback(read())),
    };
  }
}

describe('version runner', () => {
  test('a pass creates and records every version, and a second pass writes nothing', async () => {
    const store = MemoryStore.make({ title: 'Plan', tags: ['a'] });
    const edges = [edgeOf(false)];
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(Object.keys(DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID)).sort()).toEqual([
      '0.1.0',
      '0.2.0',
    ]);
    expect(store.dataAt('0.2.0')).toEqual({ name: 'Plan', tags: ['a'], done: false });

    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test('branch version documents two devices create concurrently merge, keeping edits made in either', async () => {
    const store = MemoryStore.make({ title: 'Plan', tags: [] });
    // A user branch of the object, opened before the upgrade.
    const originUrl = store.root.doc().links?.[OBJECT_ID]?.toString();
    const origin = originUrl && store.docs.get(originUrl);
    invariant(origin, 'no origin');
    const memberUrl = generateAutomergeUrl();
    store.docs.set(memberUrl, A.clone(origin, freshActor()));
    store.root.change((root) => {
      root.branches = { [OBJECT_ID]: { b1: { members: { [OBJECT_ID]: new A.RawString(memberUrl) } } } };
    });
    const other = store.fork();
    const edges = [edgeOf(false)];
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    await syncVersionDocuments(other, edges, [OBJECT_ID]);
    const branchV2 = (device: MemoryStore) => {
      const url = device.root.doc().branches?.[OBJECT_ID]?.b1?.versions?.[OBJECT_ID]?.['0.2.0']?.toString();
      invariant(url, 'no branch v2');
      return url;
    };
    for (const [device, tag] of [
      [store, 'one'],
      [other, 'two'],
    ] as const) {
      const url = branchV2(device);
      const doc = device.docs.get(url);
      invariant(doc, 'no branch v2 document');
      device.docs.set(
        url,
        A.change(doc, (draft) => {
          draft.objects?.[OBJECT_ID]?.data.tags.push(tag);
        }),
      );
    }

    store.exchange(other);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const merged = store.docs.get(branchV2(store));
    expect(merged && JSON.parse(JSON.stringify(merged.objects?.[OBJECT_ID]?.data.tags)).sort()).toEqual(['one', 'two']);
  });

  test("another device's branch of the same name stays out of this branch's version documents", async () => {
    const store = MemoryStore.make({ title: 'Plan', tags: [] });
    store.root.change((root) => {
      root.branches = { [OBJECT_ID]: {} };
    });
    const other = store.fork();
    const edges = [edgeOf(false)];
    // Each device opens its own `b1` while apart, so the two records conflict under one name.
    for (const device of [store, other]) {
      const originUrl = device.root.doc().links?.[OBJECT_ID]?.toString();
      const origin = originUrl && device.docs.get(originUrl);
      invariant(origin, 'no origin');
      const memberUrl = generateAutomergeUrl();
      device.docs.set(memberUrl, A.clone(origin, freshActor()));
      device.root.change((root) => {
        const branches = root.branches?.[OBJECT_ID];
        invariant(branches, 'no branches');
        branches.b1 = { members: { [OBJECT_ID]: new A.RawString(memberUrl) } };
      });
      await syncVersionDocuments(device, edges, [OBJECT_ID]);
    }
    const branchV2 = (device: MemoryStore) => {
      const url = device.root.doc().branches?.[OBJECT_ID]?.b1?.versions?.[OBJECT_ID]?.['0.2.0']?.toString();
      invariant(url, 'no branch v2');
      return url;
    };
    for (const [device, tag] of [
      [store, 'one'],
      [other, 'two'],
    ] as const) {
      const url = branchV2(device);
      const doc = device.docs.get(url);
      invariant(doc, 'no branch v2 document');
      device.docs.set(
        url,
        A.change(doc, (draft) => {
          draft.objects?.[OBJECT_ID]?.data.tags.push(tag);
        }),
      );
    }

    store.exchange(other);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const visible = store.docs.get(branchV2(store));
    expect(visible && JSON.parse(JSON.stringify(visible.objects?.[OBJECT_ID]?.data.tags))).toHaveLength(1);
  });

  test('a pair with two different stored lenses derives no new versions', async () => {
    const store = MemoryStore.make({ title: 'Plan', tags: [] });
    await syncVersionDocuments(store, [edgeOf(false), edgeOf(true)], [OBJECT_ID]);
    expect(Object.keys(DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID))).toEqual(['0.1.0']);
  });

  test('versions derived before a conflicting lens keep translating with the lens they were derived with', async () => {
    const store = MemoryStore.make({ title: 'Plan', tags: [] });
    // Derived with the lens whose digest sorts last, so walking by digest alone would pick the other.
    await syncVersionDocuments(store, [edgeOf(true)], [OBJECT_ID]);
    const v1 = DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID)['0.1.0'];
    invariant(v1, 'no v1');
    (await store.load(v1)).change((doc) => {
      doc.objects?.[OBJECT_ID]?.data.tags.push('late');
    });

    // A member stores a second lens for the same pair: the existing v2 still follows v1, with the first.
    await syncVersionDocuments(store, [edgeOf(false), edgeOf(true)], [OBJECT_ID]);
    expect(store.dataAt('0.2.0')).toEqual({ name: 'Plan', tags: ['late'], done: true });
  });

  test('an edit inside a nested list element reaches the other version element by element', async () => {
    const OrderV1 = Type.makeObject(DXN.make('org.dxos.test.order', '0.1.0'))(
      Schema.Struct({ items: Schema.Array(Schema.Struct({ sku: Schema.String, qty: Schema.Number })) }),
    );
    const OrderV2 = Type.makeObject(DXN.make('org.dxos.test.order', '0.2.0'))(
      Schema.Struct({ items: Schema.Array(Schema.Struct({ sku: Schema.String, quantity: Schema.Number })) }),
    );
    const edges = [Lens.versionEdge(Lens.make(OrderV1, OrderV2, { items: Lens.each('items', { quantity: 'qty' }) }))];
    const store = MemoryStore.make(
      {
        items: [
          { sku: 'a', qty: 1 },
          { sku: 'b', qty: 2 },
        ],
      },
      OrderV1,
    );
    await syncVersionDocuments(store, edges, [OBJECT_ID]);

    // Concurrent edits to different elements, one in each version, both survive in both.
    store.edit('0.1.0', (data) => {
      data.items[1].qty = 5;
    });
    store.edit('0.2.0', (data) => {
      data.items[0].quantity = 9;
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.1.0')).toEqual({
      items: [
        { sku: 'a', qty: 9 },
        { sku: 'b', qty: 5 },
      ],
    });
    expect(store.dataAt('0.2.0')).toEqual({
      items: [
        { sku: 'a', quantity: 9 },
        { sku: 'b', quantity: 5 },
      ],
    });
  });

  test('a one-way property follows the older version, and an edit to it stays in the newer one', async () => {
    const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
      Schema.Struct({ first: Schema.String, last: Schema.String }),
    );
    const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
      Schema.Struct({ fullName: Schema.String }),
    );
    const edges = [
      Lens.versionEdge(
        Lens.make(
          PersonV1,
          PersonV2,
          { fullName: Lens.concat(['first', 'last'], ' ') },
          { defaults: { first: '', last: '' } },
        ),
      ),
    ];
    const store = MemoryStore.make({ first: 'Ada', last: 'Lovelace' }, PersonV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')).toEqual({ fullName: 'Ada Lovelace' });

    store.edit('0.1.0', (data) => {
      data.last = 'King';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')).toEqual({ fullName: 'Ada King' });

    store.edit('0.2.0', (data) => {
      data.fullName = 'Countess Lovelace';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.1.0')).toEqual({ first: 'Ada', last: 'King' });
    expect(store.dataAt('0.2.0')).toEqual({ fullName: 'Countess Lovelace' });
  });
});

describe('extracted objects', () => {
  const Address = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(
    Schema.Struct({ line1: Schema.String, city: Schema.String }),
  );
  const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
    Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
  );
  const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
    Schema.Struct({ name: Schema.String, address: Ref.Ref(Address) }),
  );
  const edges = [
    Lens.versionEdge(
      Lens.make(
        PersonV1,
        PersonV2,
        { address: Lens.extract('address', Address, { line1: 'street' }) },
        { defaults: { address: { street: '', city: '' } } },
      ),
    ),
  ];
  const person = { name: 'Ada', address: { street: '1 Main', city: 'London' } };

  /** The id of the object the newer version references. */
  const extractedId = (store: MemoryStore): EntityId => {
    const uri = EID.tryParse(store.dataAt('0.2.0')?.address?.['/'] ?? '');
    const id = uri && EID.getEntityId(uri);
    invariant(id, 'no reference');
    return id;
  };

  test('the newer version references an object holding the struct, and a second pass writes nothing', async () => {
    const store = MemoryStore.make(person, PersonV1);
    // An edit before the upgrade reaches the object as a translation of its own.
    store.editObject(OBJECT_ID, (entity) => {
      entity.data.name = 'Ada Lovelace';
      entity.data.address.city = 'Paris';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')).toEqual({ name: 'Ada Lovelace', address: expect.any(Object) });
    const child = store.object(extractedId(store));
    expect(child?.system?.type).toEqual(EncodedReference.fromURI(Type.getURI(Address)));
    expect(child?.meta.convergenceKey).toMatch(new RegExp(`^lens:\\w+:${OBJECT_ID}:address$`));
    expect(child?.data).toEqual({ line1: '1 Main', city: 'Paris' });

    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test('edits reach the object from the older version and the older version from the object', async () => {
    const store = MemoryStore.make(person, PersonV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const childId = extractedId(store);

    // Concurrent edits to one text, one in each, both survive in both.
    store.edit('0.1.0', (data) => {
      A.splice(data, ['address', 'street'], 0, 0, 'No. ');
    });
    store.editObject(childId, (entity) => {
      A.splice(entity.data, ['line1'], 6, 0, ' Street');
      entity.data.city = 'Paris';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.1.0')?.address).toEqual({ street: 'No. 1 Main Street', city: 'Paris' });
    expect(store.object(childId)?.data).toEqual({ line1: 'No. 1 Main Street', city: 'Paris' });
    expect(store.dataAt('0.2.0')?.name).toBe('Ada');

    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test("the parent's deletion reaches the object, and the object's does not reach the parent", async () => {
    const store = MemoryStore.make(person, PersonV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const childId = extractedId(store);
    store.editObject(childId, (entity) => {
      entity.system ??= {};
      entity.system.deleted = true;
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.object(OBJECT_ID)?.system?.deleted).toBeUndefined();

    store.editObject(childId, (entity) => {
      delete entity.system?.deleted;
    });
    const v2 = DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID)['0.2.0'];
    invariant(v2, 'no v2');
    (await store.load(v2)).change((doc) => {
      const system = doc.objects?.[OBJECT_ID]?.system;
      invariant(system, 'no system');
      system.deleted = true;
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.object(childId)?.system?.deleted).toBe(true);
  });

  test('objects two devices extract concurrently converge on the merge winner, with every edit once', async () => {
    const one = MemoryStore.make(person, PersonV1);
    const two = one.fork();
    await syncVersionDocuments(one, edges, [OBJECT_ID]);
    await syncVersionDocuments(two, edges, [OBJECT_ID]);
    const [first, second] = [extractedId(one), extractedId(two)];
    expect(first).not.toBe(second);

    // Each device edits its own object and the older version before they meet.
    one.editObject(first, (entity) => {
      A.splice(entity.data, ['line1'], 6, 0, ' Street');
    });
    two.editObject(second, (entity) => {
      A.splice(entity.data, ['line1'], 0, 0, 'No. ');
    });
    two.edit('0.1.0', (data) => {
      data.address.city = 'Paris';
    });
    await syncVersionDocuments(one, edges, [OBJECT_ID]);
    await syncVersionDocuments(two, edges, [OBJECT_ID]);
    one.exchange(two);

    // The convergence-key merge keeps the smaller id and redirects the other, without touching its data.
    const [winner, loser] = [first, second].sort();
    one.editObject(loser, (entity) => {
      entity.system ??= {};
      entity.system.mergedInto = winner;
      entity.system.deleted = true;
    });
    one.editObject(winner, (entity) => {
      entity.system ??= {};
      entity.system.mergedFrom = [loser];
    });
    for (let round = 0; round < 2; round++) {
      await syncVersionDocuments(one, edges, [OBJECT_ID]);
      await syncVersionDocuments(two, edges, [OBJECT_ID]);
      one.exchange(two);
    }

    for (const store of [one, two]) {
      expect(store.dataAt('0.1.0')?.address).toEqual({ street: 'No. 1 Main Street', city: 'Paris' });
      expect(store.object(winner)?.data).toEqual({ line1: 'No. 1 Main Street', city: 'Paris' });
    }
    // Both devices wrote the same translations.
    expect(one.state()).toBe(two.state());
  });
});

describe('extracted list elements', () => {
  const Item = Type.makeObject(DXN.make('org.dxos.test.item', '0.1.0'))(
    Schema.Struct({ sku: Schema.String, quantity: Schema.Number }),
  );
  const OrderV1 = Type.makeObject(DXN.make('org.dxos.test.order', '0.1.0'))(
    Schema.Struct({ items: Schema.Array(Schema.Struct({ sku: Schema.String, qty: Schema.Number })) }),
  );
  const OrderV2 = Type.makeObject(DXN.make('org.dxos.test.order', '0.2.0'))(
    Schema.Struct({ items: Schema.Array(Ref.Ref(Item)) }),
  );
  const edges = [
    Lens.versionEdge(
      Lens.make(
        OrderV1,
        OrderV2,
        { items: Lens.extractEach('items', Item, { quantity: 'qty' }) },
        { defaults: { items: [] } },
      ),
    ),
  ];
  const order = {
    items: [
      { sku: 'a', qty: 1 },
      { sku: 'b', qty: 2 },
    ],
  };

  /** The ids of the objects the newer version lists, in order. */
  const listed = (store: MemoryStore): EntityId[] => {
    const refs: unknown = store.dataAt('0.2.0')?.items;
    return (Array.isArray(refs) ? refs : []).flatMap((ref) => {
      const uri = EID.tryParse(ref?.['/'] ?? '');
      const id = uri && EID.getEntityId(uri);
      return id ? [id] : [];
    });
  };
  const dataOf = (store: MemoryStore) => listed(store).map((id) => store.object(id)?.data);

  test('each element becomes an object the newer version lists in order, and a second pass writes nothing', async () => {
    const store = MemoryStore.make(order, OrderV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(dataOf(store)).toEqual([
      { sku: 'a', quantity: 1 },
      { sku: 'b', quantity: 2 },
    ]);
    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test('edits to an element and to its object reach each other', async () => {
    const store = MemoryStore.make(order, OrderV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const [first, second] = listed(store);
    store.edit('0.1.0', (data) => {
      data.items[1].qty = 5;
      A.splice(data, ['items', 0, 'sku'], 1, 0, '-1');
    });
    store.editObject(first, (entity) => {
      entity.data.quantity = 9;
      A.splice(entity.data, ['sku'], 0, 0, 'x-');
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.1.0')?.items).toEqual([
      { sku: 'x-a-1', qty: 9 },
      { sku: 'b', qty: 5 },
    ]);
    expect(store.object(first)?.data).toEqual({ sku: 'x-a-1', quantity: 9 });
    expect(store.object(second)?.data).toEqual({ sku: 'b', quantity: 5 });
    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test('an inserted element gets an object in its place, and a removed one takes its object with it', async () => {
    const store = MemoryStore.make(order, OrderV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const [first, second] = listed(store);
    // An empty change starts at the same op as the insertion after it.
    const v1 = DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID)['0.1.0'];
    invariant(v1, 'no v1');
    (await store.load(v1)).update((doc) => A.emptyChange(doc));
    store.edit('0.1.0', (data) => {
      data.items.splice(1, 0, { sku: 'c', qty: 3 });
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const [, inserted] = listed(store);
    expect(listed(store)).toEqual([first, inserted, second]);
    expect(store.object(inserted)?.data).toEqual({ sku: 'c', quantity: 3 });
    // The inserted element's object translates from where its element was inserted.
    store.editObject(inserted, (entity) => {
      entity.data.quantity = 4;
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.1.0')?.items[1]).toEqual({ sku: 'c', qty: 4 });

    store.edit('0.1.0', (data) => {
      data.items.splice(0, 1);
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(listed(store)).toEqual([inserted, second]);
    expect(store.object(first)?.system?.deleted).toBe(true);
  });

  test('an object the newer version deletes takes its element with it', async () => {
    const store = MemoryStore.make(order, OrderV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    const [first, second] = listed(store);
    store.editObject(first, (entity) => {
      entity.system ??= {};
      entity.system.deleted = true;
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.1.0')?.items).toEqual([{ sku: 'b', qty: 2 }]);
    expect(listed(store)).toEqual([second]);
    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test('objects two devices extract for one element converge on the merge winner', async () => {
    const one = MemoryStore.make(order, OrderV1);
    const two = one.fork();
    await syncVersionDocuments(one, edges, [OBJECT_ID]);
    await syncVersionDocuments(two, edges, [OBJECT_ID]);
    const [oneFirst] = listed(one);
    const [twoFirst] = listed(two);
    // Both devices derive each element's object from the change that inserted it.
    expect(one.object(oneFirst)?.data).toEqual(two.object(twoFirst)?.data);
    one.editObject(oneFirst, (entity) => {
      A.splice(entity.data, ['sku'], 1, 0, '-one');
    });
    two.editObject(twoFirst, (entity) => {
      entity.data.quantity = 7;
    });
    await syncVersionDocuments(one, edges, [OBJECT_ID]);
    await syncVersionDocuments(two, edges, [OBJECT_ID]);
    one.exchange(two);

    // The convergence-key merge of the first element's pair.
    const [winner, loser] = [oneFirst, twoFirst].sort();
    one.editObject(loser, (entity) => {
      entity.system ??= {};
      entity.system.mergedInto = winner;
      entity.system.deleted = true;
    });
    one.editObject(winner, (entity) => {
      entity.system ??= {};
      entity.system.mergedFrom = [loser];
    });
    for (let round = 0; round < 3; round++) {
      await syncVersionDocuments(one, edges, [OBJECT_ID]);
      await syncVersionDocuments(two, edges, [OBJECT_ID]);
      one.exchange(two);
    }
    for (const store of [one, two]) {
      expect(store.dataAt('0.1.0')?.items[0]).toEqual({ sku: 'a-one', qty: 7 });
      expect(store.object(winner)?.data).toEqual({ sku: 'a-one', quantity: 7 });
      expect(listed(store)[0]).toBe(winner);
    }
    expect(one.state()).toBe(two.state());
  });
});

describe('absorbed objects', () => {
  const ADDRESS_ID = '01J00000000000000000000010';
  const OTHER_ID = '01J00000000000000000000020';
  const SECOND_ID = '01J00000000000000000000030';
  const Address = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(
    Schema.Struct({ line1: Schema.String, city: Schema.String }),
  );
  const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
    Schema.Struct({ name: Schema.String, address: Schema.optional(Ref.Ref(Address)) }),
  );
  const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
    Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
  );
  const edges = [
    Lens.versionEdge(Lens.make(PersonV1, PersonV2, { address: Lens.absorb('address', Address, { street: 'line1' }) })),
  ];
  const refTo = (objectId: string) => EncodedReference.fromURI(EID.make({ entityId: EntityId.make(objectId) }));

  const setup = (): MemoryStore => {
    const store = MemoryStore.make({ name: 'Ada', address: refTo(ADDRESS_ID) }, PersonV1);
    store.addObject(ADDRESS_ID, Address, { line1: '1 Main', city: 'London' });
    return store;
  };

  test('the newer version embeds the referenced object, and a second pass writes nothing', async () => {
    const store = setup();
    // An edit to the object after its creation reaches the struct as a translation of its own.
    store.editObject(ADDRESS_ID, (entity) => {
      entity.data.city = 'Paris';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')).toEqual({ name: 'Ada', address: { street: '1 Main', city: 'Paris' } });
    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test('edits reach the object from the struct and the struct from the object', async () => {
    const store = setup();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    store.edit('0.2.0', (data) => {
      A.splice(data, ['address', 'street'], 6, 0, ' Street');
    });
    store.editObject(ADDRESS_ID, (entity) => {
      A.splice(entity.data, ['line1'], 0, 0, 'No. ');
      entity.data.city = 'Paris';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')?.address).toEqual({ street: 'No. 1 Main Street', city: 'Paris' });
    expect(store.object(ADDRESS_ID)?.data).toEqual({ line1: 'No. 1 Main Street', city: 'Paris' });
    // The older version keeps its reference.
    expect(store.dataAt('0.1.0')?.address).toEqual(refTo(ADDRESS_ID));
    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.state()).toBe(before);
  });

  test("an edit to one parent's copy reaches another parent's copy of the same object", async () => {
    const store = setup();
    store.addObject(SECOND_ID, PersonV1, { name: 'Grace', address: refTo(ADDRESS_ID) });
    await syncVersionDocuments(store, edges, [OBJECT_ID, SECOND_ID]);
    store.editVersion(OBJECT_ID, '0.2.0', (data) => {
      data.address.city = 'Paris';
    });
    store.editVersion(SECOND_ID, '0.2.0', (data) => {
      A.splice(data, ['address', 'street'], 0, 0, 'No. ');
    });
    for (let round = 0; round < 2; round++) {
      await syncVersionDocuments(store, edges, [OBJECT_ID, SECOND_ID]);
    }
    const expected = { street: 'No. 1 Main', city: 'Paris' };
    expect(store.dataOf(OBJECT_ID, '0.2.0')?.address).toEqual(expected);
    expect(store.dataOf(SECOND_ID, '0.2.0')?.address).toEqual(expected);
    expect(store.object(ADDRESS_ID)?.data).toEqual({ line1: 'No. 1 Main', city: 'Paris' });
    const before = store.state();
    await syncVersionDocuments(store, edges, [OBJECT_ID, SECOND_ID]);
    expect(store.state()).toBe(before);
  });

  test('a parent that starts absorbing an object later receives the edits other parents made to their copies', async () => {
    const store = setup();
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    store.editVersion(OBJECT_ID, '0.2.0', (data) => {
      data.address.city = 'Paris';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    // Only the new parent syncs: the first parent's edit is a translation in the object, so it reaches the new
    // parent's copy only from the first parent's copy.
    store.addObject(SECOND_ID, PersonV1, { name: 'Grace', address: refTo(ADDRESS_ID) });
    await syncVersionDocuments(store, edges, [SECOND_ID]);
    expect(store.dataOf(SECOND_ID, '0.2.0')?.address).toEqual({ street: '1 Main', city: 'Paris' });
  });

  test('a repointed reference leaves the struct following the object it was absorbed from', async () => {
    const store = setup();
    store.addObject(OTHER_ID, Address, { line1: '9 Elm', city: 'Oslo' });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    store.edit('0.1.0', (data) => {
      data.address = refTo(OTHER_ID);
    });
    store.editObject(ADDRESS_ID, (entity) => {
      entity.data.city = 'Paris';
    });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')?.address).toEqual({ street: '1 Main', city: 'Paris' });
  });

  test('no version embeds the struct while the object it absorbs is unavailable', async () => {
    const store = MemoryStore.make({ name: 'Ada', address: refTo(ADDRESS_ID) }, PersonV1);
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')).toBeUndefined();
    store.addObject(ADDRESS_ID, Address, { line1: '1 Main', city: 'London' });
    await syncVersionDocuments(store, edges, [OBJECT_ID]);
    expect(store.dataAt('0.2.0')?.address).toEqual({ street: '1 Main', city: 'London' });
  });
});

describe('lens order', () => {
  const ADDRESS_ID = '01J00000000000000000000010';
  const COMPANY_ID = '01J00000000000000000000020';
  const Address = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(Schema.Struct({ line1: Schema.String }));
  const Company = Type.makeObject(DXN.make('org.dxos.test.company', '0.1.0'))(Schema.Struct({ title: Schema.String }));
  const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
    Schema.Struct({
      name: Schema.String,
      address: Schema.optional(Ref.Ref(Address)),
      employer: Schema.optional(Ref.Ref(Company)),
    }),
  );
  const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
    Schema.Struct({
      name: Schema.String,
      address: Schema.Struct({ street: Schema.String }),
      employer: Schema.optional(Ref.Ref(Company)),
    }),
  );
  const PersonV3 = Type.makeObject(DXN.make('org.dxos.test.person', '0.3.0'))(
    Schema.Struct({
      name: Schema.String,
      address: Schema.Struct({ street: Schema.String }),
      employer: Schema.Struct({ name: Schema.String }),
    }),
  );
  const edges = [
    Lens.versionEdge(Lens.make(PersonV1, PersonV2, { address: Lens.absorb('address', Address, { street: 'line1' }) })),
    Lens.versionEdge(Lens.make(PersonV2, PersonV3, { employer: Lens.absorb('employer', Company, { name: 'title' }) })),
  ];
  const refTo = (objectId: string) => EncodedReference.fromURI(EID.make({ entityId: EntityId.make(objectId) }));

  test('devices whose indexes list the lenses in different orders derive the same roots', async () => {
    const one = MemoryStore.make({ name: 'Ada', address: refTo(ADDRESS_ID), employer: refTo(COMPANY_ID) }, PersonV1);
    one.addObject(ADDRESS_ID, Address, { line1: '1 Main' });
    one.addObject(COMPANY_ID, Company, { title: 'Analytical' });
    const two = one.fork();
    await syncVersionDocuments(one, edges, [OBJECT_ID]);
    await syncVersionDocuments(two, [...edges].reverse(), [OBJECT_ID]);

    const rootOf = (store: MemoryStore) => {
      const url = DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID)['0.3.0'];
      const doc = url && store.docs.get(url);
      invariant(doc, 'no v3');
      return A.getChangesMetaSince(doc, [])[0].hash;
    };
    expect(rootOf(one)).toBe(rootOf(two));
    expect(one.dataAt('0.3.0')).toEqual({
      name: 'Ada',
      address: { street: '1 Main' },
      employer: { name: 'Analytical' },
    });
  });
});
