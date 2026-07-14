//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { ConnectorSync, LayoutOperation, SyncDatabaseMissingError } from '@dxos/app-toolkit';

const { mergeDeep, mergeField, snapshotField } = ConnectorSync;
import { Operation } from '@dxos/compute';
import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Kanban, UNCATEGORIZED_VALUE } from '@dxos/plugin-kanban';
import { Expando } from '@dxos/schema';

import { meta } from '#meta';

import { TRELLO_PIVOT_FIELD, TRELLO_SOURCE } from '../constants';
import { formatTrelloSyncFailure } from '../errors';
import { TrelloApi } from '../services';
import { TrelloOperation } from '../types';

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
  name: string;
  /**
   * Canonical column order at last pull (Trello list `pos` order). Display
   * reads this instead of `Object.keys(arrangement.columns)` because ECHO /
   * Automerge does not preserve insertion order across reload — keys come
   * back in canonical (alphabetical) order.
   *
   * Fields are required (not `?`) because the snapshot is always written in
   * one shot at the end of a pull; the "no snapshot yet" state is modeled
   * by `readSnapshot` returning `undefined`.
   */
  order: string[];
  columns: Record<string, { ids: string[] }>;
};

// Per-field three-way merge primitives are shared with other integration plugins
// (Linear, GitHub) and live in `@dxos/app-toolkit`. `readSnapshot`/`writeSnapshot` are NOT shared —
// app-toolkit's versions are typed against a relation-shaped `.snapshots` field, but a Trello binding
// is now a flat `Cursor.ExternalCursor` whose snapshots live one level down at `spec.snapshots`. These
// local equivalents read/write that field directly.

/** Reads `binding.spec.snapshots[foreignId]` typed as `T`. Returns undefined if absent. */
const readSnapshot = <T extends object>(binding: Cursor.ExternalCursor, foreignId: string): T | undefined => {
  const snapshots = (binding.spec.snapshots ?? {}) as Record<string, unknown>;
  return snapshots[foreignId] as T | undefined;
};

/**
 * Writes `binding.spec.snapshots[foreignId] = snapshot`. Allocates a fresh map so the assignment is
 * safe under ECHO's structural-sharing semantics.
 */
const writeSnapshot = (binding: Cursor.ExternalCursor, foreignId: string, snapshot: object): void => {
  Obj.update(binding, (binding) => {
    if (binding.spec.kind !== 'external') {
      return;
    }
    const existing = (binding.spec.snapshots ?? {}) as Record<string, unknown>;
    binding.spec.snapshots = { ...existing, [foreignId]: snapshot };
  });
};

/**
 * Pull reconciler with snapshot-driven three-way merge.
 *
 * For each remote card:
 *  - Per-field three-way merge over `(local, remote, snapshot)`. Local edits to
 *    fields the remote hasn't changed are preserved; remote edits to fields the
 *    user hasn't touched flow through; on both-changed the policy is remote-wins.
 *  - After the merge, refresh `binding.spec.snapshots[card.id]` to the values
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
  binding: Cursor.ExternalCursor,
  kanban: Kanban.Kanban,
  remoteBoard: TrelloBoard,
  remoteCards: ReadonlyArray<TrelloCard>,
  lists: ReadonlyArray<TrelloList>,
) => Effect.Effect<ReconcileResult, never, Database.Service> = Effect.fn('reconcileBoardCards')(
  function* (binding, kanban, remoteBoard, remoteCards, lists) {
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
        // Trello-managed cards are always Expandos (see the else branch below
        // for the only create site). Narrowing here lets us index fields
        // without an `unknown` cast.
        if (!Obj.instanceOf(Expando.Expando, existing)) {
          log.warn('trello pull: foreign-keyed local object is not an Expando; skipping', { cardId: card.id });
          continue;
        }
        const snapshot = readSnapshot<CardSnapshot>(binding, card.id);

        const merged: Record<MappedField, unknown> = { ...remoteFields };
        const writes: Partial<Record<MappedField, unknown>> = {};
        for (const field of MAPPED_FIELDS) {
          const result = mergeField(existing[field], remoteFields[field], snapshotField(snapshot, field));
          merged[field] = result.value;
          if (result.source === 'remote' && existing[field] !== result.value) {
            writes[field] = result.value;
          }
        }

        if (Object.keys(writes).length > 0) {
          Obj.update(existing, (existing) => {
            for (const [key, value] of Object.entries(writes)) {
              existing[key] = value;
            }
          });
          updated++;
        }

        // Refresh the snapshot to remote-current. Even if no writes happened
        // (no-op or local-wins), the next sync should compare against what
        // Trello currently says.
        writeSnapshot(binding, card.id, remoteFields);
      } else {
        // First time we've seen this card: create + attach. Snapshot seeded from remote.
        const obj = Obj.make(Expando.Expando, {
          [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: card.id }] },
          ...remoteFields,
        });
        const persisted = yield* Database.add(obj);
        newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);
        localByForeignId.set(card.id, persisted);
        writeSnapshot(binding, card.id, remoteFields);
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
        if (kanban.spec.kind === 'items') {
          kanban.spec.items = [...(kanban.spec.items as ReadonlyArray<Ref.Ref<Obj.Unknown>>), ...newRefs];
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
    const boardSnapshot = readSnapshot<BoardSnapshot>(binding, remoteBoard.id);
    const nameMerge = mergeField<string | undefined>(
      kanban.name,
      remoteBoard.name,
      snapshotField(boardSnapshot, 'name'),
    );
    const orderMerge = mergeDeep<string[]>(
      [...kanban.arrangement.order],
      orderedListNames,
      snapshotField(boardSnapshot, 'order'),
    );
    const columnsMerge = mergeDeep<Record<string, { ids: string[] }>>(
      kanban.arrangement.columns as Record<string, { ids: string[] }>,
      remoteColumns,
      snapshotField(boardSnapshot, 'columns'),
    );

    if (nameMerge.source === 'remote' && kanban.name !== nameMerge.value) {
      Obj.update(kanban, (kanban) => {
        kanban.name = nameMerge.value;
      });
    }
    if (orderMerge.source === 'remote') {
      Obj.update(kanban, (kanban) => {
        kanban.arrangement.order = orderMerge.value;
      });
    } else if (orderMerge.source === 'local') {
      log.warn('trello pull: local column order diverged from snapshot; push of reorders is not yet implemented', {
        boardId: remoteBoard.id,
      });
    }
    if (columnsMerge.source === 'remote') {
      Obj.update(kanban, (kanban) => {
        const prev = kanban.arrangement.columns as Record<string, { ids: string[]; hidden?: boolean }>;
        const merged = columnsMerge.value as Record<string, { ids: string[]; hidden?: boolean }>;
        // Remote columns are only Trello lists — never include UNCATEGORIZED. mergeDeep(remote-wins)
        // would drop the initial `{ hidden: true }` bucket from findOrCreateKanbanForBoard.
        const uncategorizedIds = merged[UNCATEGORIZED_VALUE]?.ids ?? prev[UNCATEGORIZED_VALUE]?.ids ?? [];
        const uncategorizedHidden = merged[UNCATEGORIZED_VALUE]?.hidden ?? prev[UNCATEGORIZED_VALUE]?.hidden ?? true;
        kanban.arrangement.columns = {
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
    writeSnapshot(binding, remoteBoard.id, {
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
 *    `binding.spec.snapshots[foreignId]` — i.e. the user edited a field that wasn't
 *    written by the most recent pull. PUT only the diverged fields.
 *
 * Tombstones (`Obj.isDeleted(target)`) are NEVER pushed: pull soft-deletes the
 * local copy when the remote card is closed or gone, and pushing that state
 * hits a 404. After a successful PUT, the snapshot is refreshed with the
 * pushed values so subsequent passes see no divergence.
 */
export const pushBoardCards = Effect.fn('pushBoardCards')(function* <R>(
  binding: Cursor.ExternalCursor,
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
    // Trello-managed cards are always Expandos; narrowing here lets us
    // index fields without an `unknown` cast.
    if (!Obj.instanceOf(Expando.Expando, target)) {
      continue;
    }

    const foreignId = Obj.getMeta(target).keys.find((key) => key.source === TRELLO_SOURCE)?.id;
    const name = typeof target.name === 'string' ? target.name : '';
    const desc = typeof target.description === 'string' ? target.description : '';
    const localListName = typeof target.listName === 'string' ? target.listName : undefined;
    const listId = localListName ? listIdByName.get(localListName) : undefined;

    if (localListName && !listId) {
      log.warn('trello push: listName has no matching remote list; card will not move', {
        cardId: Obj.getURI(target),
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
        writeSnapshot(binding, result.id, {
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
    const snapshot = (readSnapshot<CardSnapshot>(binding, foreignId) ?? {}) as CardSnapshot;
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
    writeSnapshot(binding, foreignId, {
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
    const existing = yield* Database.query(
      Query.select(Filter.foreignKeys(Kanban.Kanban, [{ source: TRELLO_SOURCE, id: boardId }])),
    ).run;
    return existing.length > 0 ? (existing[0] as Kanban.Kanban) : undefined;
  },
);

/**
 * Builds an empty items-variant Kanban for a remote board (foreign key set,
 * `pivotField: 'listName'`, empty `items`). The uncategorized column is hidden
 * by default for Trello-synced boards: every card already carries a Trello list
 * (the `pivotField`), so the uncategorized column would only show transient
 * pre-sync state.
 */
export const makeEmptyKanbanForBoard = (boardId: string, name: string): Kanban.Kanban =>
  Obj.make(Kanban.Kanban, {
    [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: boardId }] },
    name,
    arrangement: {
      order: [],
      columns: { [UNCATEGORIZED_VALUE]: { ids: [], hidden: true } },
    },
    spec: { kind: 'items' as const, pivotField: TRELLO_PIVOT_FIELD, items: [] },
  });

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
    return yield* Database.add(makeEmptyKanbanForBoard(board.id, board.name));
  });

const handler: Operation.WithHandler<typeof TrelloOperation.SyncTrelloBoard> = TrelloOperation.SyncTrelloBoard.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ binding }) {
      // TODO(wittjosiah): the operation should just depend on `Database.Service`
      //   once the OperationInvoker has a `databaseResolver`. For now, derive
      //   the db from the input ref's target and provide `Database.layer(db)`
      //   for the handler body.
      const bindingObj = binding.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }

      const toastIdSuffix = EID.getEntityId(EID.tryParse(binding.uri)!) ?? 'unknown';

      // Resolve the binding up-front so credentials can be provided from its access
      // token directly. `Database.load` is requirement-free (the ref carries its own
      // db), so this runs outside the layered body.
      const bound = yield* Database.load(binding);
      if (!Cursor.isExternal(bound)) {
        // The integration mechanism only ever creates external-sync cursors for Trello.
        return { pulled: { added: 0, updated: 0, removed: 0 }, pushed: { created: 0, updated: 0 } };
      }

      // Wrap the body in `Effect.either` so we can emit a toast on either path
      // before returning. The toast distinguishes "the sync ran" from "the sync
      // crashed" (e.g. credential parse, fetch boards, no db); the persisted
      // `lastError` on the binding carries the diagnostic detail.
      const outcome = yield* Effect.either(
        Effect.gen(function* () {
          const kanban = yield* Database.load(bound.spec.target);

          if (!Obj.instanceOf(Kanban.Kanban, kanban) || !Kanban.isKanbanItems(kanban)) {
            // The integration mechanism only ever binds items-variant Kanbans for Trello.
            return { pulled: { added: 0, updated: 0, removed: 0 }, pushed: { created: 0, updated: 0 } };
          }

          // Resolve the remote board id: prefer the binding's `externalId`, fall
          // back to the Kanban's foreign-key meta (set by `materializeTarget`).
          const boardId =
            bound.spec.externalId ?? Obj.getMeta(kanban).keys.find((key) => key.source === TRELLO_SOURCE)?.id;
          if (boardId === undefined) {
            return { pulled: { added: 0, updated: 0, removed: 0 }, pushed: { created: 0, updated: 0 } };
          }

          // Look up the remote `TrelloBoard` (for board-level fields like `name`).
          const allBoards = yield* TrelloApi.fetchBoards();
          const remoteBoard = allBoards.find((board) => board.id === boardId);
          if (!remoteBoard) {
            return { pulled: { added: 0, updated: 0, removed: 0 }, pushed: { created: 0, updated: 0 } };
          }

          // The trello-api functions return `Effect<T, HttpClientError | ParseError, HttpClient>`
          // with retry+timeout baked in. The HttpClient layer is provided at the
          // operation boundary below. Trello's cards endpoint doesn't support a
          // delta cursor, so we full-fetch every sync and never advance the
          // cursor's `value` (only its run status, below).
          const lists = yield* TrelloApi.fetchLists(boardId);
          const cards = yield* TrelloApi.fetchCards(boardId);
          const reconcileResult = yield* reconcileBoardCards(bound, kanban, remoteBoard, cards, lists);

          const pushResult = yield* pushBoardCards(bound, kanban, lists, {
            create: ({ listId, name, desc }) =>
              TrelloApi.createCard({ idList: listId, name, desc }).pipe(Effect.map((card) => ({ id: card.id }))),
            update: (foreignId, payload) =>
              TrelloApi.updateCard(foreignId, {
                name: payload.name,
                desc: payload.desc,
                idList: payload.listId,
              }).pipe(Effect.map(() => undefined)),
          });

          // Stamp success on the binding.
          Cursor.advance(bound);

          return {
            pulled: reconcileResult,
            pushed: pushResult,
          };
        }).pipe(
          // A failure mid-sync writes `lastError` on the binding then re-raises,
          // so the toast path still surfaces the crash.
          Effect.tapError((error) =>
            Effect.sync(() => {
              Cursor.recordError(bound, formatTrelloSyncFailure(error));
            }),
          ),
          Effect.provide(Database.layer(db)),
          Effect.provide(TrelloApi.TrelloCredentials.fromAccessToken(bound.spec.source)),
        ),
      );

      // Toasting is UX-only and the layout/capability service isn't always
      // present (tests, server-side invocations). `Effect.ignore` swallows
      // missing-service errors so they don't fail the sync.
      if (outcome._tag === 'Right') {
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.sync-success.${toastIdSuffix}`,
            icon: 'ph--check--regular',
            title: ['sync-toast.success.label', { ns: meta.profile.key }],
          }),
        );
        return outcome.right;
      } else {
        const message = formatTrelloSyncFailure(outcome.left);
        yield* Effect.ignore(
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.sync-error.${toastIdSuffix}`,
            icon: 'ph--warning--regular',
            title: ['sync-toast.error.label', { ns: meta.profile.key }],
            description: message,
          }),
        );
        return yield* Effect.fail(outcome.left);
      }
    }, Effect.provide(FetchHttpClient.layer)),
  ),
);

export default handler;
