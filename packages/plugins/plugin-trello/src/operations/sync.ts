//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';
import { Kanban, UNCATEGORIZED_VALUE } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';

import { meta } from '#meta';

import { TRELLO_PIVOT_FIELD, TRELLO_SOURCE } from '../constants';
import { IntegrationDatabaseMissingError, formatTrelloSyncFailure } from '../errors';
import { TrelloApi } from '../services';
import { SyncTrelloBoard } from './definitions';

type TrelloBoard = TrelloApi.TrelloBoard;
type TrelloCard = TrelloApi.TrelloCard;
type TrelloList = TrelloApi.TrelloList;

/** Pull reconcile result. */
export type ReconcileResult = {
  added: number;
  updated: number;
  removed: number;
};

/**
 * Mapped fields written to each Expando from its remote Trello card. Anything outside
 * this list (user-added properties like `priority`, `tags`, etc.) is preserved across
 * syncs — we only ever read/write these. `url` and `closed` are intentionally
 * omitted: `url` is a server-side artifact reconstructible from the card's foreign
 * id, and `closed` maps to ECHO object deletion (closed-on-Trello = removed-locally)
 * rather than a tracked field.
 */
const MAPPED_FIELDS = ['name', 'description', 'listName'] as const;
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
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
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
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
  return { value: remote, source: 'remote' };
};

/** Mutates `integration.snapshots[foreignId] = snapshot` inside an `Obj.update`. */
const writeSnapshot = (integration: Integration.Integration, foreignId: string, snapshot: object): void => {
  Obj.update(integration, (integration) => {
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
      if (!target) {
        continue;
      }
      const fid = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
      if (fid) {
        localByForeignId.set(fid, target);
      }
    }

    const newRefs: Array<Ref.Ref<Obj.Unknown>> = [];
    let added = 0;
    let updated = 0;

    let removed = 0;

    for (const card of remoteCards) {
      const remoteFields: Record<MappedField, unknown> = {
        name: card.name,
        description: card.desc,
        listName: listName(card.idList),
      };

      const existing = localByForeignId.get(card.id);

      // `closed` on Trello → soft-deleted in ECHO. We never store a `closed`
      // field locally; the card disappears from the database (the ref stays
      // in `kanban.spec.items` to preserve arrangement on undelete or
      // re-sync).
      if (card.closed) {
        if (existing && !Obj.isDeleted(existing)) {
          yield* Database.remove(existing);
          removed++;
        }
        // Skip first-sight create when remote already says closed.
        continue;
      }

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
          Obj.update(existing, (existing) => {
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

    // Cards present locally that aren't in the remote response — treat the
    // same as a closed remote: soft-delete the local object. The ref in
    // `kanban.spec.items` is preserved.
    const remoteIds = new Set(remoteCards.map((c) => c.id));
    for (const [fid, target] of localByForeignId) {
      if (remoteIds.has(fid)) {
        continue;
      }
      if (!Obj.isDeleted(target)) {
        yield* Database.remove(target);
        removed++;
      }
    }

    if (newRefs.length > 0) {
      Obj.update(kanban, (kanban) => {
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
      if (!cardsByList.has(ln)) {
        cardsByList.set(ln, []);
      }
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
      Obj.update(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        m.name = nameMerge.value;
      });
    }
    if (orderMerge.source === 'remote') {
      Obj.update(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        m.arrangement.order = orderMerge.value;
      });
    } else if (orderMerge.source === 'local') {
      log.warn('trello pull: local column order diverged from snapshot; push of reorders is not yet implemented', {
        boardId: remoteBoard.id,
      });
    }
    if (columnsMerge.source === 'remote') {
      Obj.update(kanban, (kanban) => {
        const m = kanban as Obj.Mutable<typeof kanban>;
        const prev = m.arrangement.columns as Record<string, { ids: string[]; hidden?: boolean }>;
        const merged = columnsMerge.value as Record<string, { ids: string[]; hidden?: boolean }>;
        // Remote columns are only Trello lists — never include UNCATEGORIZED. mergeDeep(remote-wins)
        // would drop the initial `{ hidden: true }` bucket from findOrCreateKanbanForBoard.
        const uncategorizedIds = merged[UNCATEGORIZED_VALUE]?.ids ?? prev[UNCATEGORIZED_VALUE]?.ids ?? [];
        const uncategorizedHidden = merged[UNCATEGORIZED_VALUE]?.hidden ?? prev[UNCATEGORIZED_VALUE]?.hidden ?? true;
        m.arrangement.columns = {
          ...merged,
          [UNCATEGORIZED_VALUE]: { ids: uncategorizedIds, hidden: uncategorizedHidden },
        };
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
 * Tombstones (`Obj.isDeleted(target)`) are NEVER pushed: pull soft-deletes the
 * local copy when the remote card is closed or gone, and pushing that state
 * hits a 404. After a successful PUT, the snapshot is refreshed with the
 * pushed values so subsequent passes see no divergence.
 */
export const pushBoardCards = Effect.fn('pushBoardCards')(function* <R>(
  integration: Integration.Integration,
  kanban: Kanban.Kanban,
  lists: ReadonlyArray<TrelloList>,
  push: {
    /** Wraps `TrelloApi.createCard` so the reconciler stays HTTP-agnostic. */
    create: (input: { listId: string; name: string; desc: string }) => Effect.Effect<{ id: string }, Error, R>;
    /** Wraps `TrelloApi.updateCard`. */
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
    if (!target) {
      continue;
    }

    // Soft-deleted locally → skip push. Pull tombstones the local copy when
    // the remote is closed/missing; pushing a tombstone hits a 404. Once the
    // local object is `Obj.isDeleted`, we have nothing meaningful to send.
    if (Obj.isDeleted(target)) {
      continue;
    }

    const fields = target as unknown as Record<string, unknown>;

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
      if (!listId) {
        continue;
      }
      const result = yield* push.create({ listId, name, desc });
      // Re-read foreign keys before writing — if a concurrent run wrote one already,
      // skip the local FK write so we don't end up with two FK entries on this object.
      const current = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
      if (!current) {
        Obj.update(target, (target) => {
          Obj.deleteKeys(target, TRELLO_SOURCE);
          Obj.getMeta(target).keys.push({ source: TRELLO_SOURCE, id: result.id });
        });
        // Seed the snapshot with the values we just sent so the very next pull
        // (which will return this same card) is a no-op for these fields.
        writeSnapshot(integration, result.id, {
          name,
          description: desc,
          listName: localListName ?? '',
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

    if (!diverged) {
      continue;
    }

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

/**
 * Finds an existing items-variant Kanban whose foreign key matches the given remote board id.
 * Returns undefined when no such Kanban has been materialized in this space yet.
 */
export const findKanbanForBoard: (
  boardId: string,
) => Effect.Effect<Kanban.Kanban | undefined, never, Database.Service> = Effect.fn('findKanbanForBoard')(
  function* (boardId) {
    const existing = yield* Database.runQuery(
      Query.select(Filter.foreignKeys(Kanban.Kanban, [{ source: TRELLO_SOURCE, id: boardId }])),
    );
    return existing.length > 0 ? (existing[0] as Kanban.Kanban) : undefined;
  },
);

/**
 * Finds an existing items-variant Kanban whose foreign key matches the given remote board,
 * or creates a fresh one (with the foreign key set, `pivotField: 'listName'`, and an empty
 * `items` array). Idempotent: re-running on the same `(space, board)` returns the same Kanban.
 */
export const findOrCreateKanbanForBoard: (board: TrelloBoard) => Effect.Effect<Kanban.Kanban, never, Database.Service> =
  Effect.fn('findOrCreateKanbanForBoard')(function* (board) {
    const existing = yield* findKanbanForBoard(board.id);
    if (existing) {
      return existing;
    }

    // Hide the uncategorized column by default for Trello-synced boards: every
    // card already carries a Trello list (the `pivotField`), so the
    // uncategorized column would only show transient pre-sync state.
    const kanban = Obj.make(Kanban.Kanban, {
      [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: board.id }] },
      name: board.name,
      arrangement: {
        order: [],
        columns: { [UNCATEGORIZED_VALUE]: { ids: [], hidden: true } },
      },
      spec: { kind: 'items' as const, pivotField: TRELLO_PIVOT_FIELD, items: [] },
    });
    return yield* Database.add(kanban);
  });

/**
 * Reconciles cards for currently-selected Trello targets on the Integration.
 *
 * Pull-then-push on each target. Failure on one target writes lastError on
 * that target only and continues with the next. Targets are processed in
 * parallel up to `TARGET_CONCURRENCY` to overlap network round-trips while
 * staying within Trello's per-token rate limits.
 */
const TARGET_CONCURRENCY = 3;

const handler: Operation.WithHandler<typeof SyncTrelloBoard> = SyncTrelloBoard.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration, kanban: kanbanRef }) {
      // TODO(wittjosiah): the operation should just depend on `Database.Service`
      //   once the OperationInvoker has a `databaseResolver`. For now, derive
      //   the db from the input ref's target and provide `Database.layer(db)`
      //   for the handler body.
      const integrationTarget = integration.target;
      const db = integrationTarget ? Obj.getDatabase(integrationTarget) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      const integrationId = integration.dxn.asEchoDXN()?.echoId ?? 'unknown';
      const toastIdSuffix = kanbanRef
        ? `${integrationId}.${kanbanRef.dxn.asEchoDXN()?.echoId ?? 'unknown'}`
        : integrationId;

      // Wrap the body in `Effect.either` so we can emit a toast on either path
      // before returning. Per-target failures stay silent at the toast level
      // (they're surfaced via `lastError` on each target row instead); the
      // toast only distinguishes "the whole sync ran" from "the whole sync
      // crashed before per-target work began" (e.g. credential parse, fetch
      // boards, no db).
      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const integrationObj = yield* Database.load(integration);

          // Fetch the user's boards once so each target can look up its remote
          // `TrelloBoard` (for board-level fields like `name`). One round-trip
          // regardless of target count, and we already know `fetchBoards` is part
          // of the surface area used by `GetTrelloBoards`.
          const allBoards = yield* TrelloApi.fetchBoards();
          const boardsById = new Map(allBoards.map((b) => [b.id, b]));

          // Determine which target entries to process and materialize their local
          // Kanbans on demand. Targets stored without a local object (the dialog
          // recorded `{ remoteId, name }` only) get a Kanban find-or-created here
          // and the ref written back; subsequent syncs see `target.object` and
          // skip materialization. This is where `getSyncTargets`'s read-only
          // discovery hands off to actual local writes.
          // Stored target refs use the space-relative form (`dxn:echo:@:...`); the
          // input `kanbanRef` may be absolute. Compare by echo id to be tolerant.
          const kanbanFilterId = kanbanRef?.dxn.asEchoDXN()?.echoId;
          const targetEntries: Array<{
            entry: (typeof integrationObj.targets)[number];
            kanban: Kanban.Kanban;
            boardId: string;
            remoteBoard: (typeof allBoards)[number];
          }> = [];
          for (const target of integrationObj.targets) {
            // Resolve the foreign id: prefer `target.remoteId` (set by the dialog
            // for selected-but-not-yet-synced targets), fall back to the existing
            // local object's foreign-key meta (set by older targets that have
            // already been materialized).
            let foreignId = target.remoteId;
            let localObj = target.object?.target;
            if (foreignId === undefined && localObj) {
              foreignId = Obj.getMeta(localObj).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
            }
            if (foreignId === undefined) {
              continue;
            }
            const remoteBoard = boardsById.get(foreignId);
            if (!remoteBoard) {
              continue;
            }

            // Materialize the local Kanban if we don't have one yet, and write
            // the ref back into the target so subsequent syncs skip this branch.
            if (!localObj) {
              localObj = yield* findOrCreateKanbanForBoard(remoteBoard);
              const materializedRef = Ref.make(localObj);
              Obj.update(integrationObj, (integrationObj) => {
                const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                const idx = mutable.targets.findIndex((t) => t.remoteId === foreignId);
                if (idx >= 0) {
                  mutable.targets[idx] = { ...mutable.targets[idx], object: materializedRef };
                }
              });
            }

            const targetEchoId = Ref.make(localObj).dxn.asEchoDXN()?.echoId;
            if (kanbanFilterId && targetEchoId !== kanbanFilterId) {
              continue;
            }
            if (!Obj.instanceOf(Kanban.Kanban, localObj)) {
              continue;
            }
            if (!Kanban.isKanbanItems(localObj)) {
              continue;
            }

            targetEntries.push({ entry: target, kanban: localObj, boardId: foreignId, remoteBoard });
          }

          const perTarget = yield* Effect.forEach(
            targetEntries,
            ({ kanban: targetKanban, boardId, remoteBoard }) =>
              Effect.gen(function* () {
                const result = yield* Effect.either(
                  Effect.gen(function* () {
                    // The trello-api functions return `Effect<T, HttpClientError | ParseError, HttpClient>`
                    // with retry+timeout baked in. The HttpClient layer is provided at the
                    // operation boundary below. Trello's cards endpoint doesn't support a
                    // delta cursor, so we full-fetch every sync and don't read/write
                    // `target.cursor` here.
                    const lists = yield* TrelloApi.fetchLists(boardId);
                    const cards = yield* TrelloApi.fetchCards(boardId);
                    const reconcileResult = yield* reconcileBoardCards(
                      integrationObj,
                      targetKanban,
                      remoteBoard,
                      cards,
                      lists,
                    );

                    const pushResult = yield* pushBoardCards(integrationObj, targetKanban, lists, {
                      create: ({ listId, name, desc }) =>
                        TrelloApi.createCard({ idList: listId, name, desc }).pipe(
                          Effect.map((card) => ({ id: card.id })),
                        ),
                      update: (foreignId, payload) =>
                        TrelloApi.updateCard(foreignId, {
                          name: payload.name,
                          desc: payload.desc,
                          idList: payload.listId,
                        }).pipe(Effect.map(() => undefined)),
                    });

                    return { reconcileResult, pushResult };
                  }),
                );

                // Update the target entry in place with success/failure status.
                // Match by `remoteId` (stable across runs) with a fallback to
                // local-object echo id for legacy entries that lack `remoteId`.
                Obj.update(integrationObj, (integrationObj) => {
                  const m = integrationObj as Obj.Mutable<typeof integrationObj>;
                  const idx = m.targets.findIndex((t) => {
                    if (t.remoteId !== undefined) {
                      return t.remoteId === boardId;
                    }
                    const localId = t.object?.target
                      ? Obj.getMeta(t.object.target).keys.find((k) => k.source === TRELLO_SOURCE)?.id
                      : undefined;
                    return localId === boardId;
                  });
                  if (idx < 0) {
                    return;
                  }
                  if (result._tag === 'Right') {
                    m.targets[idx] = {
                      ...m.targets[idx],
                      lastSyncAt: new Date().toISOString(),
                      lastError: undefined,
                    };
                  } else {
                    m.targets[idx] = {
                      ...m.targets[idx],
                      lastError: formatTrelloSyncFailure(result.left),
                    };
                  }
                });

                return result._tag === 'Right' ? result.right : undefined;
              }),
            { concurrency: TARGET_CONCURRENCY },
          );

          // Aggregate counts across successful targets.
          let pulled = { added: 0, updated: 0, removed: 0 };
          let pushed = { created: 0, updated: 0 };
          for (const r of perTarget) {
            if (!r) {
              continue;
            }
            pulled = {
              added: pulled.added + r.reconcileResult.added,
              updated: pulled.updated + r.reconcileResult.updated,
              removed: pulled.removed + r.reconcileResult.removed,
            };
            pushed = {
              created: pushed.created + r.pushResult.created,
              updated: pushed.updated + r.pushResult.updated,
            };
          }

          return { pulled, pushed };
        }).pipe(
          Effect.provide(Database.layer(db)),
          Effect.provide(TrelloApi.TrelloCredentials.fromIntegration(integration)),
        ),
      );

      // Toasting is UX-only and the layout/capability service isn't always
      // present (tests, server-side invocations). `Effect.ignore` swallows
      // missing-service errors so they don't fail the sync.
      if (outcome._tag === 'Right') {
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}.sync-success.${toastIdSuffix}`,
            icon: 'ph--check--regular',
            title: ['sync-toast.success.label', { ns: meta.id }],
          }),
        );
        return outcome.right;
      } else {
        const message = formatTrelloSyncFailure(outcome.left);
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}.sync-error.${toastIdSuffix}`,
            icon: 'ph--warning--regular',
            title: ['sync-toast.error.label', { ns: meta.id }],
            description: message,
          }),
        );
        return yield* Effect.fail(outcome.left);
      }
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
