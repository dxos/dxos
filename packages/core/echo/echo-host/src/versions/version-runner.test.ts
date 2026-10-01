//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { generateAutomergeUrl } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Lens, Type } from '@dxos/echo';
import { DatabaseDirectory, EncodedReference, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

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

/** Version documents in memory, as a host's repo holds them. */
class MemoryStore implements VersionStore {
  readonly docs = new Map<string, VersionDoc>();
  readonly root: VersionDocHandle;

  constructor(objectData: Record<string, unknown>) {
    const origin = generateAutomergeUrl();
    this.docs.set(
      origin,
      A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.version = SpaceDocVersion.CURRENT;
        draft.objects = {
          [OBJECT_ID]: {
            system: { kind: 'object', type: EncodedReference.fromURI(Type.getURI(TaskV1)) },
            meta: { keys: [] },
            data: objectData,
          },
        };
      }),
    );
    const root = generateAutomergeUrl();
    this.docs.set(
      root,
      A.change(A.init<DatabaseDirectory>(), (draft) => {
        draft.version = SpaceDocVersion.CURRENT;
        draft.links = { [OBJECT_ID]: new A.RawString(origin) };
      }),
    );
    this.root = this.#handle(root);
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

  dataAt(version: string): unknown {
    const url = DatabaseDirectory.getVersionDocUrls(this.root.doc(), OBJECT_ID)[version];
    const doc = url && this.docs.get(url);
    return doc ? JSON.parse(JSON.stringify(doc.objects?.[OBJECT_ID]?.data)) : undefined;
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
      change: (callback) => this.docs.set(url, A.change(read(), callback)),
      update: (callback) => this.docs.set(url, callback(read())),
    };
  }
}

describe('version runner', () => {
  test('a pass creates and records every version, and a second pass writes nothing', async () => {
    const store = new MemoryStore({ title: 'Plan', tags: ['a'] });
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
    const store = new MemoryStore({ title: 'Plan', tags: [] });
    await syncVersionDocuments(store, [edgeOf(false), edgeOf(true)], [OBJECT_ID]);
    expect(Object.keys(DatabaseDirectory.getVersionDocUrls(store.root.doc(), OBJECT_ID))).toEqual(['0.1.0']);
  });

  test('versions derived before a conflicting lens keep translating with the lens they were derived with', async () => {
    const store = new MemoryStore({ title: 'Plan', tags: [] });
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
});
