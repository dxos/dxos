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

import { ConvergenceKeyMerger, type ConvergenceKeyMergerDeps } from './convergence-key-merge';

const KEY = 'example.com/thing/main';
const SPACE_ID = SpaceId.random();

// Fixed ULIDs with a known ordering: A < B < C, so A is the canonical winner.
const ID_A = EntityId.make('01J00000000000000000000000');
const ID_B = EntityId.make('01J00000000000000000000001');
const ID_C = EntityId.make('01J00000000000000000000002');

const makeEntity = (convergenceKey: string, data: Record<string, unknown>): EntityStructure => ({
  system: { kind: 'object' },
  meta: { keys: [], convergenceKey },
  data,
});

type Fixture = {
  handles: Map<EntityId, DocHandle<DatabaseDirectory>>;
  group: { objectId: EntityId; documentId: string }[];
  context: ConvergenceKeyMergerDeps;
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
      queryByConvergenceKeys: async () => [],
      queryReferrers: async () => [],
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

describe('ConvergenceKeyMerger.mergeGroup', () => {
  test('an edit landing while another document loads is folded and covered by the watermark', async ({ expect }) => {
    // The loser loads first; the edit lands during the winner's load. The merge must compute
    // from the post-edit state — reading at load time would put the edit below the tombstone's
    // watermark, where no later fold ever looks.
    const fixture = setup([
      [ID_B, makeEntity(KEY, { title: 'b' })],
      [ID_A, makeEntity(KEY, { title: 'a' })],
    ]);
    let loads = 0;
    const context: ConvergenceKeyMergerDeps = {
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

    expect(await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group)).toBe(
      true,
    );

    const winner = entityOf(fixture, ID_A);
    const loser = entityOf(fixture, ID_B);
    expect(winner?.data.title).toBe('a');
    expect(winner?.data.description).toBe('landed during load');
    expect(loser?.system?.mergedInto).toBe(ID_A);
    expect(loser?.system?.deleted).toBe(true);
    // Idempotent: the watermark covers the edit, so a re-run writes nothing.
    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(false);
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

    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(true);

    const winner = entityOf(fixture, ID_A);
    expect(winner?.data.description).toBe('straggler');
    expect(entityOf(fixture, ID_B)?.system?.mergedInto).toBe(ID_A);
    // C's original redirect is preserved; resolution reaches A transitively.
    expect(entityOf(fixture, ID_C)?.system?.mergedInto).toBe(ID_B);
    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(false);
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
    const context: ConvergenceKeyMergerDeps = {
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

    expect(await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group)).toBe(
      true,
    );

    expect(entityOf(fixture, ID_A)?.data.description).toBe('v2');
    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(false);
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

    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(true);
    expect(entityOf(fixture, ID_C)?.system?.deleted).toBe(true);
    expect(entityOf(fixture, ID_A)?.data.description).toBeUndefined();

    edit(fixture, ID_A, (entity) => {
      if (entity.system) {
        entity.system.deleted = false;
      }
    });
    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(true);
    expect(entityOf(fixture, ID_A)?.data.description).toBe('straggler');
  });

  test('a loser re-keyed during the durability flush is not tombstoned', async ({ expect }) => {
    // Re-keying declares a different identity; converting it into a redirect would destroy an
    // entity the user just split off.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
    ]);
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      flushDoc: async () => {
        edit(fixture, ID_B, (entity) => {
          entity.meta.convergenceKey = 'example.com/thing/other';
        });
      },
    };

    await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group);

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
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      flushDoc: async () => {
        edit(fixture, ID_A, (entity) => {
          if (entity.system) {
            entity.system.deleted = true;
          }
        });
      },
    };

    await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group);

    const survivor = entityOf(fixture, ID_B);
    expect(survivor?.system?.mergedInto).toBeUndefined();
    expect(survivor?.system?.deleted).toBeFalsy();
  });

  test('loser tombstones are flushed before the group reports serviced', async ({ expect }) => {
    // The orchestrator clears the durable intent when the group reports serviced, so the
    // tombstones must already be on disk — an intent must never die before the tombstone it
    // claims exists. The winner's fold flushes first, then every loser document, each already
    // carrying its tombstone at flush time.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
      [ID_C, makeEntity(KEY, { title: 'c' })],
    ]);
    const flushed: string[] = [];
    const tombstonedAtFlush = new Map<EntityId, boolean>();
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      flushDoc: async (_ctx, documentId) => {
        flushed.push(documentId);
        const member = fixture.group.find((entry) => entry.documentId === documentId);
        if (member) {
          tombstonedAtFlush.set(member.objectId, entityOf(fixture, member.objectId)?.system?.deleted === true);
        }
      },
    };

    expect(await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group)).toBe(
      true,
    );

    const documentIdOf = (id: EntityId) => fixture.handles.get(id)?.documentId;
    expect(flushed[0]).toBe(documentIdOf(ID_A));
    expect(new Set(flushed.slice(1))).toEqual(new Set([documentIdOf(ID_B), documentIdOf(ID_C)]));
    expect(tombstonedAtFlush.get(ID_B)).toBe(true);
    expect(tombstonedAtFlush.get(ID_C)).toBe(true);
  });

  test('a stale surviving watermark from a concurrent merge never re-folds already-folded edits', async ({
    expect,
  }) => {
    // Two peers merge the same pair concurrently: each records its own `mergedAtHeads`, and
    // automerge keeps one value plus a conflict. Diffing from the union of both means an edit
    // the other peer already folded is never re-presented — a re-fold from the stale surviving
    // watermark would overwrite the newer winner edit ('v3') with the loser's old value ('v2').
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'v1' })],
    ]);
    const handleB = fixture.handles.get(ID_B);
    if (!handleB) {
      throw new Error('fixture is missing the loser handle');
    }

    // Peer 2's view: sees a later edit ('v2'), merges, and records a watermark covering it.
    let fork = A.clone(handleB.doc());
    fork = A.change(fork, (doc) => {
      const entity = doc.objects?.[ID_B];
      if (entity) {
        entity.data.title = 'v2';
      }
    });
    const peer2Watermark = A.getHeads(fork);
    fork = A.change(fork, (doc) => {
      const entity = doc.objects?.[ID_B];
      if (entity?.system) {
        entity.system.mergedInto = ID_A;
        entity.system.mergedAtHeads = [...peer2Watermark];
        entity.system.deleted = true;
      }
    });

    // Peer 1's view (this host): never saw 'v2'. The extra edits pump the op counter so peer 1's
    // register write deterministically survives the conflict — leaving the STALE watermark.
    edit(fixture, ID_B, (entity) => {
      entity.data.note = 'n1';
    });
    edit(fixture, ID_B, (entity) => {
      entity.data.note = 'n2';
    });
    edit(fixture, ID_B, (entity) => {
      entity.data.note = 'n3';
    });
    const peer1Watermark = A.getHeads(handleB.doc());
    redirect(fixture, ID_B, ID_A);

    // The concurrent states meet; peer 2's fold ('v2') replicated onto the winner too, and a
    // user has since edited the winner to 'v3'.
    handleB.update((doc) => A.merge(doc, fork));
    edit(fixture, ID_A, (entity) => {
      entity.data.title = 'v2';
    });
    edit(fixture, ID_A, (entity) => {
      entity.data.title = 'v3';
    });

    // Precondition for the scenario: the stale watermark survived, the other rides as a conflict.
    const loser = entityOf(fixture, ID_B);
    expect([...(loser?.system?.mergedAtHeads ?? [])]).toEqual(peer1Watermark);
    expect(loser?.system && A.getConflicts(loser.system, 'mergedAtHeads')).toBeDefined();

    // Nothing is above the union, so the pass folds nothing and 'v3' stands.
    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(false);
    expect(entityOf(fixture, ID_A)?.data.title).toBe('v3');

    // The union must not over-suppress: a genuinely new straggler edit, above both watermarks,
    // still folds — without re-presenting the already-folded title.
    edit(fixture, ID_B, (entity) => {
      entity.data.description = 'late';
    });
    expect(
      await new ConvergenceKeyMerger(fixture.context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group),
    ).toBe(true);
    expect(entityOf(fixture, ID_A)?.data.description).toBe('late');
    expect(entityOf(fixture, ID_A)?.data.title).toBe('v3');
  });

  test('a fold flushes the advanced watermark before the group reports serviced', async ({ expect }) => {
    // Same dual on the fold path: the watermark advance claims the fold happened, so it must be
    // durable before the intent that would retry it is cleared.
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
    ]);
    redirect(fixture, ID_B, ID_A);
    edit(fixture, ID_B, (entity) => {
      entity.data.title = 'straggler';
    });
    const flushed: string[] = [];
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      flushDoc: async (_ctx, documentId) => {
        flushed.push(documentId);
      },
    };

    expect(await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, fixture.group)).toBe(
      true,
    );

    expect(entityOf(fixture, ID_A)?.data.title).toBe('straggler');
    const documentIdOf = (id: EntityId) => fixture.handles.get(id)?.documentId;
    expect(flushed).toEqual([documentIdOf(ID_A), documentIdOf(ID_B)]);
  });
});

describe('ConvergenceKeyMerger reference rewriting', () => {
  const REFERRER_KEY = 'example.com/thing/referrer';
  const ID_REF = EntityId.make('01J00000000000000000000009');

  /** A fixture whose third entity is a referrer outside the merge group. */
  const setupWithReferrer = (referrerData: Record<string, unknown>) => {
    const fixture = setup([
      [ID_A, makeEntity(KEY, { title: 'a' })],
      [ID_B, makeEntity(KEY, { title: 'b' })],
      [ID_REF, makeEntity(REFERRER_KEY, referrerData)],
    ]);
    const group = fixture.group.slice(0, 2);
    const referrers = (propPaths: readonly (readonly string[])[]) => async (_spaceId: SpaceId, targetId: EntityId) =>
      targetId === ID_B ? [{ objectId: ID_REF, documentId: fixture.group[2].documentId, propPaths }] : [];
    return { fixture, group, referrers };
  };

  const localRef = (id: EntityId) => ({ '/': `echo:///${id}` });

  test('referrers of a loser are repointed at the winner, nested and array paths included', async ({ expect }) => {
    const { fixture, group, referrers } = setupWithReferrer({
      owner: localRef(ID_B),
      nested: { link: localRef(ID_B) },
      items: [localRef(ID_B), localRef(ID_A)],
    });
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      queryReferrers: referrers([['owner'], ['nested', 'link'], ['items', '0']]),
    };

    expect(await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, group)).toBe(true);

    const referrer = entityOf(fixture, ID_REF);
    expect(referrer?.data.owner).toEqual(localRef(ID_A));
    expect((referrer?.data.nested as { link: unknown }).link).toEqual(localRef(ID_A));
    expect((referrer?.data.items as unknown[])[0]).toEqual(localRef(ID_A));
    expect((referrer?.data.items as unknown[])[1]).toEqual(localRef(ID_A));
  });

  test('a space-qualified reference keeps its qualification', async ({ expect }) => {
    const { fixture, group, referrers } = setupWithReferrer({
      owner: { '/': `echo://${SPACE_ID}/${ID_B}` },
    });
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      queryReferrers: referrers([['owner']]),
    };

    await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, group);

    expect(entityOf(fixture, ID_REF)?.data.owner).toEqual({ '/': `echo://${SPACE_ID}/${ID_A}` });
  });

  test('a stale index row — the path no longer holds a ref to the loser — writes nothing', async ({ expect }) => {
    const { fixture, group, referrers } = setupWithReferrer({
      owner: localRef(ID_A),
      title: 'not a ref',
    });
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      queryReferrers: referrers([['owner'], ['title'], ['gone']]),
    };
    const before = A.getHeads(fixture.handles.get(ID_REF)!.doc());

    await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, group);

    expect(A.getHeads(fixture.handles.get(ID_REF)!.doc())).toEqual(before);
  });

  test('a tombstoned referrer is left alone', async ({ expect }) => {
    const { fixture, group, referrers } = setupWithReferrer({ owner: localRef(ID_B) });
    edit(fixture, ID_REF, (entity) => {
      if (entity.system) {
        entity.system.deleted = true;
      }
    });
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      queryReferrers: referrers([['owner']]),
    };

    await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, group);

    expect(entityOf(fixture, ID_REF)?.data.owner).toEqual(localRef(ID_B));
  });

  test('a referrer lookup failure does not fail the merge', async ({ expect }) => {
    const { fixture, group } = setupWithReferrer({ owner: localRef(ID_B) });
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      queryReferrers: async () => {
        throw new Error('index fault');
      },
    };

    expect(await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, group)).toBe(true);
    expect(entityOf(fixture, ID_B)?.system?.mergedInto).toBe(ID_A);
    // The ref stays behind and still resolves through the redirect.
    expect(entityOf(fixture, ID_REF)?.data.owner).toEqual(localRef(ID_B));
  });

  test('servicing a re-indexed loser re-covers referrers that arrived after the merge', async ({ expect }) => {
    // The merge already happened (B redirected to A); a late referrer to B indexes afterwards and
    // re-presents the key. The fold pass must rewrite it even with no data edits to fold.
    const { fixture, group, referrers } = setupWithReferrer({ owner: localRef(ID_B) });
    redirect(fixture, ID_B, ID_A);
    const context: ConvergenceKeyMergerDeps = {
      ...fixture.context,
      queryReferrers: referrers([['owner']]),
    };

    await new ConvergenceKeyMerger(context).mergeGroup(Context.default(), SPACE_ID, KEY, group);

    expect(entityOf(fixture, ID_REF)?.data.owner).toEqual(localRef(ID_A));
  });
});

describe('ConvergenceKeyMerger.mergeDuplicates', () => {
  test('a throwing group is reported un-serviced without blocking the rest of the batch', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const goodKey = 'example.com/thing/good';
    const badKey = 'example.com/thing/bad';
    const good = setup([
      [ID_A, makeEntity(goodKey, { title: 'a' })],
      [ID_B, makeEntity(goodKey, { title: 'b' })],
    ]);
    const makeRow = (objectId: EntityId, documentId: string, convergenceKey: string): EntityMeta => ({
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
      convergenceKey,
      version: 0,
      createdAt: null,
      updatedAt: null,
      queuePosition: null,
    });
    const rows = [
      ...good.group.map(({ objectId, documentId }) => makeRow(objectId, documentId, goodKey)),
      makeRow(ID_C, 'automerge:unloadable-1', badKey),
      makeRow(EntityId.make('01J00000000000000000000003'), 'automerge:unloadable-2', badKey),
    ];

    const merger = new ConvergenceKeyMerger({
      queryByConvergenceKeys: async (_spaceId, keys) =>
        rows.filter(({ convergenceKey }) => convergenceKey !== null && keys.includes(convergenceKey)),
      loadDoc: async (ctx, documentId) => {
        if (String(documentId).startsWith('automerge:unloadable')) {
          throw new Error('storage fault');
        }
        return good.context.loadDoc(ctx, documentId);
      },
      flushDoc: async () => {},
      queryReferrers: async () => [],
    });
    const result = await merger.mergeDuplicates(Context.default(), new Map([[spaceId, new Set([goodKey, badKey])]]));

    expect(result.mergedGroups).toBe(1);
    expect(result.serviced.get(spaceId)?.has(goodKey)).toBe(true);
    expect(result.serviced.get(spaceId)?.has(badKey)).toBe(false);
    expect(entityOf(good, ID_B)?.system?.mergedInto).toBe(ID_A);
  });
});
