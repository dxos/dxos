//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';
import { Kanban } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';

import { TRELLO_SOURCE } from '../constants';
import { type TrelloBoard, type TrelloCard, type TrelloList } from '../services/trello-api';

/** Pull reconcile result. */
export type ReconcileResult = {
  added: number;
  updated: number;
  removed: number;
};

/**
 * Mapped fields written to each Expando from its remote Trello card. Anything outside
 * this list (user-added properties like `priority`, `tags`, etc.) is preserved across
 * syncs — we only ever read/write these five.
 */
const MAPPED_FIELDS = ['name', 'description', 'listName', 'url', 'closed'] as const;
type MappedField = (typeof MAPPED_FIELDS)[number];
type CardSnapshot = Partial<Record<MappedField, unknown>>;

type BoardSnapshot = {
  name?: string;
  /**
   * Canonical column order at last pull (Trello list `pos` order). Display
   * reads this instead of `Object.keys(arrangement.columns)` because ECHO /
   * Automerge does not preserve insertion order across reload — keys come
   * back in canonical (alphabetical) order.
   */
  order?: string[];
  columns?: Record<string, { ids: string[] }>;
};

/**
 * Per-field three-way merge over `(local, remote, snapshot)`.
 *
 * - No snapshot (first sync of this id): take remote.
 * - Local unchanged, remote unchanged → no-op (return local).
 * - Local unchanged, remote changed → take remote (pull).
 * - Local changed, remote unchanged → keep local (push will write it).
 * - Both changed → **remote wins** (Trello is source of truth; local edit is lost).
 *
 * Equality is `===` for primitives (which is what Trello's mapped fields are).
 * For object/array values use `mergeDeep` instead.
 */
const mergeField = <T>(
  local: T,
  remote: T,
  snapshot: T | undefined,
): { value: T; source: 'local' | 'remote' | 'unchanged' } => {
  if (snapshot === undefined) {
    return { value: remote, source: local === remote ? 'unchanged' : 'remote' };
  }
  const localChanged = local !== snapshot;
  const remoteChanged = remote !== snapshot;
  if (!localChanged && !remoteChanged) {return { value: local, source: 'unchanged' };}
  if (!localChanged && remoteChanged) {return { value: remote, source: 'remote' };}
  if (localChanged && !remoteChanged) {return { value: local, source: 'local' };}
  return { value: remote, source: 'remote' };
};

/** Deep-equal merge for object values (e.g. arrangement). Same policy as `mergeField`. */
const mergeDeep = <T>(
  local: T,
  remote: T,
  snapshot: T | undefined,
): { value: T; source: 'local' | 'remote' | 'unchanged' } => {
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (snapshot === undefined) {
    return { value: remote, source: eq(local, remote) ? 'unchanged' : 'remote' };
  }
  const localChanged = !eq(local, snapshot);
  const remoteChanged = !eq(remote, snapshot);
  if (!localChanged && !remoteChanged) {return { value: local, source: 'unchanged' };}
  if (!localChanged && remoteChanged) {return { value: remote, source: 'remote' };}
  if (localChanged && !remoteChanged) {return { value: local, source: 'local' };}
  return { value: remote, source: 'remote' };
};

/** Mutates `integration.snapshots[foreignId] = snapshot` inside an `Obj.change`. */
const writeSnapshot = (integration: Integration.Integration, foreignId: string, snapshot: object): void => {
  Obj.change(integration, (integration) => {
    const m = integration as Obj.Mutable<typeof integration>;
    const existing = (m.snapshots ?? {}) as Record<string, unknown>;
    m.snapshots = { ...existing, [foreignId]: snapshot };
  });
};

const readSnapshot = <T extends object>(integration: Integration.Integration, foreignId: string): T | undefined => {
  const snapshots = (integration.snapshots ?? {}) as Record<string, unknown>;
  return snapshots[foreignId] as T | undefined;
};

/**
 * Pull reconciler with snapshot-driven three-way merge.
 *
 * For each remote card:
 *  - Per-field three-way merge over `(local, remote, snapshot)`. Local edits to
 *    fields the remote hasn't changed are preserved; remote edits to fields the
 *    user hasn't touched flow through; on both-changed the policy is remote-wins.
 *  - After the merge, refresh `integration.snapshots[card.id]` to the values
 *    currently on the remote — so the next sync's three-way merge starts from
 *    Trello's current state.
 *
 * For new remote cards (no local with matching foreign id): create an Expando,
 * stamp the foreign key, append to `kanban.spec.items`, and seed the snapshot.
 *
 * For local cards with a foreign key absent from the remote response: soft-close
 * (`closed = true`) and refresh the snapshot's `closed` field — so we don't try
 * to push the tombstone back next pass.
 *
 * For the board itself: three-way merge of `kanban.name` and the
 * remote-derived arrangement against the board snapshot. This pull pass writes
 * outputs in-place; any "local-wins" fields would be pushed by `pushBoardCards`
 * (board-level push is currently TODO; see notes below).
 */
export const reconcileBoardCards: (
  integration: Integration.Integration,
  kanban: Kanban.Kanban,
  remoteBoard: TrelloBoard,
  remoteCards: ReadonlyArray<TrelloCard>,
  lists: ReadonlyArray<TrelloList>,
) => Effect.Effect<ReconcileResult, never, Database.Service> = Effect.fn('reconcileBoardCards')(
  function* (integration, kanban, remoteBoard, remoteCards, lists) {
    if (!Kanban.isKanbanItems(kanban)) {
      // The integration mechanism only ever creates items-variant Kanbans for Trello.
      return { added: 0, updated: 0, removed: 0 };
    }
    const itemsSpec = kanban.spec;

    const listName = (idList: string): string => lists.find((l) => l.id === idList)?.name ?? '';

    const localByForeignId = new Map<string, Obj.Unknown>();
    for (const ref of itemsSpec.items) {
      const target = ref.target;
      if (!target) {continue;}
      const fid = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
      if (fid) {localByForeignId.set(fid, target);}
    }

    const newRefs: Array<Ref.Ref<Obj.Unknown>> = [];
    let added = 0;
    let updated = 0;

    for (const card of remoteCards) {
      const remoteFields: Record<MappedField, unknown> = {
        name: card.name,
        description: card.desc,
        listName: listName(card.idList),
        url: card.url,
        closed: card.closed,
      };

      const existing = localByForeignId.get(card.id);
      if (existing) {
        const snapshot = readSnapshot<CardSnapshot>(integration, card.id) ?? {};
        const fields = existing as unknown as Record<string, unknown>;

        const merged: Record<MappedField, unknown> = { ...remoteFields };
        const writes: Partial<Record<MappedField, unknown>> = {};
        for (const k of MAPPED_FIELDS) {
          const result = mergeField(fields[k], remoteFields[k], snapshot[k]);
          merged[k] = result.value;
          if (result.source === 'remote' && fields[k] !== result.value) {
            writes[k] = result.value;
          }
        }

        if (Object.keys(writes).length > 0) {
          Obj.change(existing, (existing) => {
            const m = existing as unknown as Record<string, unknown>;
            for (const [k, v] of Object.entries(writes)) {
              m[k] = v;
            }
          });
          updated++;
        }

        // Refresh the snapshot to remote-current. Even if no writes happened
        // (no-op or local-wins), the next sync should compare against what
        // Trello currently says.
        writeSnapshot(integration, card.id, remoteFields);
      } else {
        // First time we've seen this card: create + attach. Snapshot seeded from remote.
        const obj = Obj.make(Expando.Expando, {
          [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: card.id }] },
          ...remoteFields,
        });
        const persisted = yield* Database.add(obj);
        newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);
        localByForeignId.set(card.id, persisted);
        writeSnapshot(integration, card.id, remoteFields);
        added++;
      }
    }

    // Soft-close: cards present locally with a Trello foreign id that aren't in the
    // remote response. Tombstones stay in `kanban.spec.items` to preserve arrangement;
    // they're filtered out at render time by `useItemsProjection` / `ItemsKanbanContainer`.
    const remoteIds = new Set(remoteCards.map((c) => c.id));
    let removed = 0;
    for (const [fid, target] of localByForeignId) {
      if (remoteIds.has(fid)) {continue;}
      const wasClosed = (target as unknown as Record<string, unknown>).closed === true;
      if (!wasClosed) {
        Obj.change(target, (target) => {
          (target as unknown as Record<string, unknown>).closed = true;
        });
        removed++;
      }
      // Refresh the snapshot's `closed` flag so push doesn't try to bounce the
      // tombstone back to Trello next pass.
      const prev = (readSnapshot<CardSnapshot>(integration, fid) ?? {}) as CardSnapshot;
      writeSnapshot(integration, fid, { ...prev, closed: true });
    }

    if (newRefs.length > 0) {
      Obj.change(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        if (m.spec.kind === 'items') {
          m.spec.items = [...(m.spec.items as ReadonlyArray<Ref.Ref<Obj.Unknown>>), ...newRefs];
        }
      });
    }

    // Build remote-derived arrangement: iterate `lists` sorted by `pos` (canonical
    // Trello list order, independent of the order cards happen to come back in),
    // and emit a column entry per list — even empty ones — so all columns show up.
    //
    // Iteration order matters. ECHO/Automerge does NOT preserve the insertion
    // order of `Object.keys(arrangement.columns)` across reload (canonical map
    // order is alphabetical). The display layer reads `arrangement.order` —
    // populated below — to get a stable canonical ordering instead.
    const cardsByList = new Map<string, TrelloCard[]>();
    for (const card of remoteCards) {
      const ln = listName(card.idList);
      if (!cardsByList.has(ln)) {cardsByList.set(ln, []);}
      cardsByList.get(ln)!.push(card);
    }
    const sortedLists = [...lists].sort((a, b) => a.pos - b.pos);
    const orderedListNames = sortedLists.map((l) => l.name);
    const remoteColumns: Record<string, { ids: string[] }> = {};
    for (const list of sortedLists) {
      const cards = cardsByList.get(list.name) ?? [];
      const sorted = [...cards].sort((a, b) => a.pos - b.pos);
      const ids = sorted
        .map((card) => localByForeignId.get(card.id))
        .filter((obj): obj is Obj.Unknown => obj != null)
        .map((obj) => obj.id);
      remoteColumns[list.name] = { ids };
    }

    // Board-level three-way merge: name + arrangement.order + arrangement.columns.
    // Local-wins outputs are left in place but currently NOT pushed back to
    // Trello — board rename and arrangement reorder push aren't implemented yet.
    const boardSnapshot = readSnapshot<BoardSnapshot>(integration, remoteBoard.id) ?? {};
    const nameMerge = mergeField<string | undefined>(kanban.name, remoteBoard.name, boardSnapshot.name);
    const orderMerge = mergeDeep<string[]>([...kanban.arrangement.order], orderedListNames, boardSnapshot.order);
    const columnsMerge = mergeDeep<Record<string, { ids: string[] }>>(
      kanban.arrangement.columns as Record<string, { ids: string[] }>,
      remoteColumns,
      boardSnapshot.columns,
    );

    if (nameMerge.source === 'remote' && kanban.name !== nameMerge.value) {
      Obj.change(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        m.name = nameMerge.value;
      });
    }
    if (orderMerge.source === 'remote') {
      Obj.change(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        m.arrangement.order = orderMerge.value;
      });
    } else if (orderMerge.source === 'local') {
      log.warn('trello pull: local column order diverged from snapshot; push of reorders is not yet implemented', {
        boardId: remoteBoard.id,
      });
    }
    if (columnsMerge.source === 'remote') {
      Obj.change(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        m.arrangement.columns = columnsMerge.value;
      });
    } else if (columnsMerge.source === 'local') {
      log.warn('trello pull: local per-column ids diverged from snapshot; push of reorders is not yet implemented', {
        boardId: remoteBoard.id,
      });
    }

    // Refresh the board snapshot to what's currently on Trello (post-merge).
    writeSnapshot(integration, remoteBoard.id, {
      name: remoteBoard.name,
      order: orderedListNames,
      columns: remoteColumns,
    });

    return { added, updated, removed };
  },
);

/** Push reconcile result. */
export type PushResult = {
  created: number;
  updated: number;
};

/**
 * Push reconciler. Iterates `kanban.spec.items` and pushes locally-diverged cards
 * back to Trello, using the snapshot to detect what's actually been edited locally.
 *
 * What gets pushed:
 *  - Cards WITHOUT a Trello foreign key — locally created, never seen by Trello. POST.
 *  - Cards WITH a foreign key whose local field values differ from
 *    `integration.snapshots[foreignId]` — i.e. the user edited a field that wasn't
 *    written by the most recent pull. PUT only the diverged fields.
 *
 * Tombstones (`closed === true`) are NEVER pushed: pull marks `closed` when the
 * remote card is gone, and pushing that state hits a 404. After a successful PUT,
 * the snapshot is refreshed with the pushed values so subsequent passes see no
 * divergence.
 */
export const pushBoardCards = Effect.fn('pushBoardCards')(function* <R>(
  integration: Integration.Integration,
  kanban: Kanban.Kanban,
  lists: ReadonlyArray<TrelloList>,
  push: {
    /** Wraps `trelloApi.createCard` so the reconciler stays HTTP-agnostic. */
    create: (input: { listId: string; name: string; desc: string }) => Effect.Effect<{ id: string }, Error, R>;
    /** Wraps `trelloApi.updateCard`. */
    update: (
      foreignId: string,
      input: { name?: string; desc?: string; listId?: string },
    ) => Effect.Effect<void, Error, R>;
  },
) {
  if (kanban.spec.kind !== 'items') {
    return { created: 0, updated: 0 };
  }
  const itemsSpec = kanban.spec;

  const listIdByName = new Map(lists.map((l) => [l.name, l.id]));

  let created = 0;
  let updated = 0;

  for (const ref of itemsSpec.items) {
    const target = ref.target;
    if (!target) {continue;}

    const fields = target as unknown as Record<string, unknown>;
    if (fields.closed === true) {continue;} // tombstones never push

    const foreignId = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
    const name = typeof fields.name === 'string' ? fields.name : '';
    const desc = typeof fields.description === 'string' ? fields.description : '';
    const localListName = typeof fields.listName === 'string' ? fields.listName : undefined;
    const listId = localListName ? listIdByName.get(localListName) : undefined;

    if (localListName && !listId) {
      log.warn('trello push: listName has no matching remote list; card will not move', {
        cardId: Obj.getDXN(target).toString(),
        listName: localListName,
      });
    }

    if (!foreignId) {
      // Locally-created card: POST + writeback. Need a list to put it in.
      if (!listId) {continue;}
      const result = yield* push.create({ listId, name, desc });
      // Re-read foreign keys before writing — if a concurrent run wrote one already,
      // skip the local FK write so we don't end up with two FK entries on this object.
      const current = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
      if (!current) {
        Obj.change(target, (target) => {
          Obj.deleteKeys(target, TRELLO_SOURCE);
          Obj.getMeta(target).keys.push({ source: TRELLO_SOURCE, id: result.id });
        });
        // Seed the snapshot with the values we just sent so the very next pull
        // (which will return this same card) is a no-op for these fields.
        writeSnapshot(integration, result.id, {
          name,
          description: desc,
          listName: localListName ?? '',
          url: '',
          closed: false,
        });
        created++;
      }
      continue;
    }

    // Foreign-keyed card: per-field diff against the snapshot. Anything that
    // diverges locally was a user edit since the last successful pull (pull
    // refreshes the snapshot to remote-current at the end of every run).
    //
    // If the snapshot is missing a field (e.g. brand-new MAPPED_FIELDS entry,
    // or a corrupt snapshot), treat that as "no signal" and skip pushing the
    // field — we can't tell whether local was edited.
    const snapshot = (readSnapshot<CardSnapshot>(integration, foreignId) ?? {}) as CardSnapshot;
    const updatePayload: { name?: string; desc?: string; listId?: string } = {};
    let diverged = false;

    if (snapshot.name !== undefined && snapshot.name !== name) {
      updatePayload.name = name;
      diverged = true;
    }
    if (snapshot.description !== undefined && snapshot.description !== desc) {
      updatePayload.desc = desc;
      diverged = true;
    }
    if (snapshot.listName !== undefined && snapshot.listName !== localListName && listId !== undefined) {
      updatePayload.listId = listId;
      diverged = true;
    }

    if (!diverged) {continue;}

    yield* push.update(foreignId, updatePayload);
    // Refresh the snapshot with the values just pushed.
    writeSnapshot(integration, foreignId, {
      ...snapshot,
      name,
      description: desc,
      listName: localListName ?? snapshot.listName,
    });
    updated++;
  }

  return { created, updated };
});
