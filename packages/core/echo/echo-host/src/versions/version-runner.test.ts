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
import { DXN, EID, type EntityId } from '@dxos/keys';

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
