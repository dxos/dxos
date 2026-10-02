//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import {
  type DocumentId,
  generateAutomergeUrl,
  interpretAsDocumentId,
  isValidAutomergeUrl,
} from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { Lens, Ref, Type } from '@dxos/echo';
import { DatabaseDirectory, EncodedReference, type EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { DXN, EID, EntityId, SpaceId, type URI } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { AutomergeHost } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { VersionTranslator } from './version-translator.ts';

const PERSON_ID = '01J00000000000000000000000';
const ADDRESS_ID = '01J00000000000000000000010';
const LENS_ID = '01J00000000000000000000020';

const Address = Type.makeObject(DXN.make('org.dxos.test.address', '0.1.0'))(
  Schema.Struct({ line1: Schema.String, city: Schema.String }),
);
const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String, address: Schema.optional(Ref.Ref(Address)) }),
);
const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.person', '0.2.0'))(
  Schema.Struct({ name: Schema.String, address: Schema.Struct({ street: Schema.String, city: Schema.String }) }),
);
const absorbing = Lens.make(PersonV1, PersonV2, { address: Lens.absorb('address', Address, { street: 'line1' }) });

const refTo = (objectId: string) => EncodedReference.fromURI(EID.make({ entityId: EntityId.make(objectId) }));

const entity = (type: Type.AnyObj | URI.URI, data: Record<string, unknown>, kind: 'object' | 'lens' = 'object') => ({
  system: { kind, type: EncodedReference.fromURI(typeof type === 'string' ? type : Type.getURI(type)) },
  meta: { keys: [] },
  data,
});

const directory = (objects: Record<string, EntityStructure>): A.Doc<DatabaseDirectory> =>
  A.change(A.init<DatabaseDirectory>(), (draft) => {
    draft.version = SpaceDocVersion.CURRENT;
    draft.objects = objects;
  });

/** A space on one host: its root, its objects' documents, and the index rows the translator queries. */
class TestSpace {
  readonly spaceId = SpaceId.random();
  readonly rows = new Map<string, { objectId: string; documentId: string }[]>();
  rootId: DocumentId | undefined;

  constructor(readonly host: AutomergeHost) {}

  async open(): Promise<void> {
    using root = await this.host.createDoc<DatabaseDirectory>({ version: SpaceDocVersion.CURRENT, links: {} });
    this.rootId = root.documentId;
  }

  /** Stores `object` in a document of its own (with id `documentId`, when given), and links it. */
  async add(
    objectId: string,
    object: EntityStructure,
    { documentId, link = true }: { documentId?: DocumentId; link?: boolean } = {},
  ): Promise<DocumentId> {
    using created = await this.host.createDoc(directory({ [objectId]: object }), {
      preserveHistory: true,
      documentId,
    });
    this.index(object.system?.type, objectId, created.documentId);
    if (link) {
      await this.link(objectId, created.documentId);
    }
    return created.documentId;
  }

  /** Links `objectId` to a document, which need not be available. */
  async link(objectId: string, documentId: DocumentId): Promise<void> {
    using root = await this.#root();
    root.change((doc) => {
      doc.links ??= {};
      doc.links[objectId] = new A.RawString(`automerge:${documentId}`);
    });
  }

  index(type: EncodedReference | undefined, objectId: string, documentId: string): void {
    const uri = type && EncodedReference.toURI(type);
    if (uri) {
      this.rows.set(uri, [...(this.rows.get(uri) ?? []), { objectId, documentId }]);
    }
  }

  async storeLens(lens: Lens.Any, deleted = false): Promise<void> {
    const stored = entity(Type.getURI(Lens.Stored), JSON.parse(JSON.stringify(Lens.toStored(lens))), 'lens');
    await this.add(LENS_ID, { ...stored, system: { ...stored.system, deleted } });
  }

  async versionUrls(objectId: string): Promise<Record<string, string>> {
    using root = await this.#root();
    return Object.fromEntries(
      Object.entries(DatabaseDirectory.getVersionDocUrls(root.doc(), objectId)).map(([version, url]) => [
        version,
        url.toString(),
      ]),
    );
  }

  async dataAt(objectId: string, version: string): Promise<unknown> {
    const url = (await this.versionUrls(objectId))[version];
    if (!url || !isValidAutomergeUrl(url)) {
      return undefined;
    }
    using lease = await this.host.loadDoc<DatabaseDirectory>(Context.default(), interpretAsDocumentId(url));
    return JSON.parse(JSON.stringify(lease?.doc()?.objects?.[objectId]?.data));
  }

  async #root() {
    const rootId = this.rootId;
    if (!rootId) {
      throw new Error('space not open');
    }
    const root = await this.host.loadDoc<DatabaseDirectory>(Context.default(), rootId);
    if (!root) {
      throw new Error('root unavailable');
    }
    return root;
  }
}

const setup = async (spaceCount = 1, { onReferrers }: { onReferrers?: () => Promise<void> } = {}) => {
  const { runtime, dispose } = createTestSqliteRuntime();
  onTestFinished(() => dispose());
  const host = new AutomergeHost({ runtime });
  await openAndClose(host);
  const spaces = Array.from({ length: spaceCount }, () => new TestSpace(host));
  for (const space of spaces) {
    await space.open();
  }
  const translator = new VersionTranslator({
    spaceIds: () => spaces.map((space) => space.spaceId),
    rootDocumentId: (spaceId) => spaces.find((space) => space.spaceId === spaceId)?.rootId,
    queryType: async (spaceId, typeDXN) => spaces.find((space) => space.spaceId === spaceId)?.rows.get(typeDXN) ?? [],
    loadDoc: (ctx, documentId, opts) => host.loadDoc<DatabaseDirectory>(ctx, documentId, opts),
    createDoc: (doc) => host.createDoc<DatabaseDirectory>(doc, { preserveHistory: true }),
    queryReferrers: async () => {
      await onReferrers?.();
      return [];
    },
  });
  const ctx = new Context();
  onTestFinished(async () => {
    await ctx.dispose();
  });
  return { host, spaces, translator, ctx };
};

describe('version translator', () => {
  test('an object whose document is not available holds back no other space', async () => {
    const { spaces, translator, ctx } = await setup(2);
    const [stuck, live] = spaces;
    for (const space of spaces) {
      await space.storeLens(absorbing);
    }
    await stuck.link(PERSON_ID, interpretAsDocumentId(generateAutomergeUrl()));
    stuck.index(EncodedReference.fromURI(Type.getURI(PersonV1)), PERSON_ID, 'unavailable');
    await live.add(ADDRESS_ID, entity(Address, { line1: '1 Main', city: 'London' }));
    await live.add(PERSON_ID, entity(PersonV1, { name: 'Ada', address: refTo(ADDRESS_ID) }));

    await translator.schedule(ctx);
    expect(await live.dataAt(PERSON_ID, '0.2.0')).toEqual({
      name: 'Ada',
      address: { street: '1 Main', city: 'London' },
    });
  });

  test('an object whose sync failed is synced once the document it lacked arrives', async () => {
    const { spaces, translator, ctx } = await setup();
    const [space] = spaces;
    await space.storeLens(absorbing);
    const addressDocumentId = interpretAsDocumentId(generateAutomergeUrl());
    await space.link(ADDRESS_ID, addressDocumentId);
    await space.add(PERSON_ID, entity(PersonV1, { name: 'Ada', address: refTo(ADDRESS_ID) }));

    await translator.schedule(ctx);
    expect(await space.dataAt(PERSON_ID, '0.2.0')).toBeUndefined();

    await space.add(ADDRESS_ID, entity(Address, { line1: '1 Main', city: 'London' }), {
      documentId: addressDocumentId,
      link: false,
    });
    await translator.schedule(ctx);
    expect(await space.dataAt(PERSON_ID, '0.2.0')).toEqual({
      name: 'Ada',
      address: { street: '1 Main', city: 'London' },
    });
  });

  test('a version that waits for an absorbed object is derived once the object is linked', async () => {
    const { spaces, translator, ctx } = await setup();
    const [space] = spaces;
    await space.storeLens(absorbing);
    await space.add(PERSON_ID, entity(PersonV1, { name: 'Ada', address: refTo(ADDRESS_ID) }));

    await translator.schedule(ctx);
    expect(await space.dataAt(PERSON_ID, '0.2.0')).toBeUndefined();

    // Nothing about the person changes: only the space root, which now links the object.
    await space.add(ADDRESS_ID, entity(Address, { line1: '1 Main', city: 'London' }));
    await translator.schedule(ctx);
    expect(await space.dataAt(PERSON_ID, '0.2.0')).toEqual({
      name: 'Ada',
      address: { street: '1 Main', city: 'London' },
    });
  });

  test('a deleted lens translates nothing', async () => {
    const { spaces, translator, ctx } = await setup();
    const [space] = spaces;
    await space.storeLens(absorbing, true);
    await space.add(ADDRESS_ID, entity(Address, { line1: '1 Main', city: 'London' }));
    await space.add(PERSON_ID, entity(PersonV1, { name: 'Ada', address: refTo(ADDRESS_ID) }));

    await translator.schedule(ctx);
    expect(await space.versionUrls(PERSON_ID)).toEqual({});
  });

  test('an edit that lands while an object syncs is translated by the next pass', async () => {
    let edit: (() => Promise<void>) | undefined;
    const { host, spaces, translator, ctx } = await setup(1, {
      // Runs after the pass translated the object, as a replicated edit arriving mid-pass would.
      onReferrers: async () => {
        const pending = edit;
        edit = undefined;
        await pending?.();
      },
    });
    const [space] = spaces;
    await space.storeLens(absorbing);
    await space.add(ADDRESS_ID, entity(Address, { line1: '1 Main', city: 'London' }));
    const personDocumentId = await space.add(PERSON_ID, entity(PersonV1, { name: 'Ada', address: refTo(ADDRESS_ID) }));
    await translator.schedule(ctx);

    edit = async () => {
      using person = await host.loadDoc<DatabaseDirectory>(Context.default(), personDocumentId);
      person?.change((doc) => {
        const data = doc.objects?.[PERSON_ID]?.data;
        if (data) {
          data.name = 'Ada Lovelace';
        }
      });
    };
    // A pass that finds the edit: the object changed since it was synced.
    using person = await host.loadDoc<DatabaseDirectory>(Context.default(), personDocumentId);
    person?.change((doc) => {
      const data = doc.objects?.[PERSON_ID]?.data;
      if (data) {
        data.address = refTo(ADDRESS_ID);
      }
    });
    await translator.schedule(ctx);
    await translator.schedule(ctx);
    expect(await space.dataAt(PERSON_ID, '0.2.0')).toMatchObject({ name: 'Ada Lovelace' });
  });
});
