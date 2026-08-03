//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocHandle, Repo, initSubduction } from '@automerge/automerge-repo';
import { beforeAll, describe, test } from 'vitest';

import { Context } from '@dxos/context';
import { DatabaseDirectory, type EntityStructure } from '@dxos/echo-protocol';
import { type EntityMeta } from '@dxos/index-core';
import { EntityId, SpaceId, URI } from '@dxos/keys';

import { type NaturalKeyGroupContext, mergeNaturalKeyDuplicates, mergeNaturalKeyGroup } from './natural-key-merge';

const KEY = 'example.com/thing/main';

// Fixed ULIDs with a known ordering: A < B < C, so A is the canonical winner.
const ID_A = EntityId.make('01J00000000000000000000000');
const ID_B = EntityId.make('01J00000000000000000000001');
const ID_C = EntityId.make('01J00000000000000000000002');

const makeEntity = (naturalKey: string, data: Record<string, unknown>): EntityStructure => ({
  system: { kind: 'object' },
  meta: { keys: [], naturalKey },
  data,
});

type Fixture = {
  handles: Map<EntityId, DocHandle<DatabaseDirectory>>;
  group: { objectId: EntityId; documentId: string }[];
  context: NaturalKeyGroupContext;
};

/**
 * One document per entity, mirroring production layout, in the given group order.
 */
const setup = (entities: [EntityId, EntityStructure][]): Fixture => {
  const repo = new Repo({ network: [] });
  const handles = new Map<EntityId, DocHandle<DatabaseDirectory>>();
  const byDocumentId = new Map<string, DocHandle<DatabaseDirectory>>();
  const group: { objectId: EntityId; documentId: string }[] = [];
  for (const [objectId, entity] of entities) {
    const handle = repo.create<DatabaseDirectory>(DatabaseDirectory.make({ objects: { [objectId]: entity } }));
    handles.set(objectId, handle);
    byDocumentId.set(handle.documentId, handle);
    group.push({ objectId, documentId: handle.documentId });
  }
  return {
    handles,
    group,
    context: {
      loadDoc: async (_ctx, documentId) => byDocumentId.get(documentId) ?? null,
      flushDoc: async () => {},
    },
  };
};

const entityOf = (fixture: Fixture, id: EntityId): EntityStructure | undefined =>
  fixture.handles.get(id)?.doc()?.objects?.[id];

const edit = (fixture: Fixture, id: EntityId, mutate: (entity: EntityStructure) => void): void => {
  fixture.handles.get(id)?.change((doc) => {
    const entity = doc.objects?.[id];
    if (entity) {
      mutate(entity);
    }
  });
};

/** Redirect an entity in place, capturing the watermark the way the production merge does. */
const redirect = (fixture: Fixture, id: EntityId, winner: EntityId): void => {
  const handle = fixture.handles.get(id);
  if (!handle) {
    return;
  }
  const heads = A.getHeads(handle.doc());
  handle.change((doc) => {
    const entity = doc.objects?.[id];
    if (entity?.system) {
      entity.system.mergedInto = winner;
      entity.system.mergedAtHeads = [...heads];
      entity.system.deleted = true;
    }
  });
};

// Subduction-fork `Repo` constructs a `MemorySigner` internally; WASM must be initialized first
// or the constructor throws on `memorysigner_new`.
beforeAll(async () => {
  await initSubduction();
});

describe('mergeNaturalKeyGroup', () => {
  test('an edit landing while another document loads is folded and covered by the watermark', async ({ expect }) => {
    // The loser loads first; the edit lands during the winner's load. The merge must compute
    // from the post-edit state — reading at load time would put the edit below the tombstone's
    // watermark, where no later fold ever looks.
    const fixture = setup([
      [ID_B, makeEntity(KEY, { title: 'b' })],
      [ID_A, makeEntity(KEY, { title: 'a' })],
    ]);
    let loads = 0;
    const context: NaturalKeyGroupContext = {
      ...fixture.context,
      loadDoc: async (ctx, documentId) => {
        loads++;
        if (loads === 2) {
          edit(fixture, ID_B, (entity) => {
            entity.data.description = 'landed during load';
          });
        }
        return fixture.context.loadDoc(ctx, documentId);
      },
    };

    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, context)).toBe(true);

    const winner = entityOf(fixture, ID_A);
    const loser = entityOf(fixture, ID_B);
    expect(winner?.data.title).toBe('a');
    expect(winner?.data.description).toBe('landed during load');
    expect(loser?.system?.mergedInto).toBe(ID_A);
    expect(loser?.system?.deleted).toBe(true);
    // Idempotent: the watermark covers the edit, so a re-run writes nothing.
    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, fixture.context)).toBe(false);
  });

  test('a straggler edit on a chain member collapsed in the same pass reaches the final winner', async ({ expect }) => {
    // C was already merged into B; a straggler edit landed on C's tombstone. The same pass then
    // merges B into A — the fold must follow C -> B -> A through the redirect written moments
    // earlier, and must not advance C's watermark on an aborted fold.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
      [ID_C, makeEntity(KEY, { title: 'c' })],
    ]);
    redirect(fixture, ID_C, ID_B);
    edit(fixture, ID_C, (entity) => {
      entity.data.description = 'straggler';
    });

    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, fixture.context)).toBe(true);

    const winner = entityOf(fixture, ID_A);
    expect(winner?.data.description).toBe('straggler');
    expect(entityOf(fixture, ID_B)?.system?.mergedInto).toBe(ID_A);
    // C's original redirect is preserved; resolution reaches A transitively.
    expect(entityOf(fixture, ID_C)?.system?.mergedInto).toBe(ID_B);
    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, fixture.context)).toBe(false);
  });

  test('the fold writes the value from the same state as the diff and the watermark', async ({ expect }) => {
    // A first straggler edit is followed by a second one landing during the winner's doc load.
    // Value, diff, and watermark must come from one state — folding the first value while
    // watermarking past the second would replace the newest edit with an older one, permanently.
    const fixture = setup([
      [ID_C, makeEntity(KEY, { title: 'c' })],
      [ID_A, makeEntity(KEY, { title: 'a' })],
    ]);
    redirect(fixture, ID_C, ID_A);
    edit(fixture, ID_C, (entity) => {
      entity.data.description = 'v1';
    });
    let loads = 0;
    const context: NaturalKeyGroupContext = {
      ...fixture.context,
      loadDoc: async (ctx, documentId) => {
        loads++;
        if (loads === 2) {
          edit(fixture, ID_C, (entity) => {
            entity.data.description = 'v2';
          });
        }
        return fixture.context.loadDoc(ctx, documentId);
      },
    };

    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, context)).toBe(true);

    expect(entityOf(fixture, ID_A)?.data.description).toBe('v2');
    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, fixture.context)).toBe(false);
  });

  test('a fold blocked by a deleted winner leaves the watermark alone for a later pass', async ({ expect }) => {
    // The redirect target is user-deleted, so the straggler edit cannot fold — but the restored
    // tombstone must still be re-asserted, and the edit must stay above the watermark so it
    // folds once the winner is restored.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_C, makeEntity(KEY, { title: 'c' })],
    ]);
    redirect(fixture, ID_C, ID_A);
    edit(fixture, ID_A, (entity) => {
      if (entity.system) {
        entity.system.deleted = true;
      }
    });
    edit(fixture, ID_C, (entity) => {
      if (entity.system) {
        entity.system.deleted = false; // A `db.add` restore.
      }
      entity.data.description = 'straggler';
    });

    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, fixture.context)).toBe(true);
    expect(entityOf(fixture, ID_C)?.system?.deleted).toBe(true);
    expect(entityOf(fixture, ID_A)?.data.description).toBeUndefined();

    edit(fixture, ID_A, (entity) => {
      if (entity.system) {
        entity.system.deleted = false;
      }
    });
    expect(await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, fixture.context)).toBe(true);
    expect(entityOf(fixture, ID_A)?.data.description).toBe('straggler');
  });

  test('a loser re-keyed during the durability flush is not tombstoned', async ({ expect }) => {
    // Re-keying declares a different identity; converting it into a redirect would destroy an
    // entity the user just split off.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
    ]);
    const context: NaturalKeyGroupContext = {
      ...fixture.context,
      flushDoc: async () => {
        edit(fixture, ID_B, (entity) => {
          entity.meta.naturalKey = 'example.com/thing/other';
        });
      },
    };

    await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, context);

    const rekeyed = entityOf(fixture, ID_B);
    expect(rekeyed?.system?.mergedInto).toBeUndefined();
    expect(rekeyed?.system?.deleted).toBeFalsy();
  });

  test('losers are not tombstoned under a winner deleted during the flush', async ({ expect }) => {
    // Deletion is respected, not merged: tombstoning the losers under a deleted winner would
    // make every copy invisible at once.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
    ]);
    const context: NaturalKeyGroupContext = {
      ...fixture.context,
      flushDoc: async () => {
        edit(fixture, ID_A, (entity) => {
          if (entity.system) {
            entity.system.deleted = true;
          }
        });
      },
    };

    await mergeNaturalKeyGroup(Context.default(), KEY, fixture.group, context);

    const survivor = entityOf(fixture, ID_B);
    expect(survivor?.system?.mergedInto).toBeUndefined();
    expect(survivor?.system?.deleted).toBeFalsy();
  });
});

describe('mergeNaturalKeyDuplicates', () => {
  test('a throwing group is reported un-serviced without blocking the rest of the batch', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const goodKey = 'example.com/thing/good';
    const badKey = 'example.com/thing/bad';
    const good = setup([
      [ID_A, makeEntity(goodKey, { title: 'a' })],
      [ID_B, makeEntity(goodKey, { title: 'b' })],
    ]);
    const makeRow = (objectId: EntityId, documentId: string, naturalKey: string): EntityMeta => ({
      recordId: 0,
      objectId,
      queueId: '',
      queueNamespace: '',
      spaceId,
      documentId,
      entityKind: 'object',
      typeDXN: URI.make('dxn:example.com/type/Test'),
      deleted: false,
      source: null,
      target: null,
      parent: null,
      naturalKey,
      version: 0,
      createdAt: null,
      updatedAt: null,
    });
    const rows = [
      ...good.group.map(({ objectId, documentId }) => makeRow(objectId, documentId, goodKey)),
      makeRow(ID_C, 'automerge:unloadable-1', badKey),
      makeRow(EntityId.make('01J00000000000000000000003'), 'automerge:unloadable-2', badKey),
    ];

    const result = await mergeNaturalKeyDuplicates(
      Context.default(),
      new Map([[spaceId, new Set([goodKey, badKey])]]),
      {
        queryByNaturalKeys: async (_spaceId, keys) =>
          rows.filter(({ naturalKey }) => naturalKey !== null && keys.includes(naturalKey)),
        loadDoc: async (ctx, documentId) => {
          if (String(documentId).startsWith('automerge:unloadable')) {
            throw new Error('storage fault');
          }
          return good.context.loadDoc(ctx, documentId);
        },
        flushDoc: async () => {},
      },
    );

    expect(result.mergedGroups).toBe(1);
    expect(result.serviced.get(spaceId)?.has(goodKey)).toBe(true);
    expect(result.serviced.get(spaceId)?.has(badKey)).toBe(false);
    expect(entityOf(good, ID_B)?.system?.mergedInto).toBe(ID_A);
  });
});
