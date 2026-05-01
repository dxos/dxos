//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Kanban } from '@dxos/plugin-kanban/types';

import { meta } from '#meta';

import { TRELLO_SOURCE } from '../constants';
import {
  TrelloCredentials,
  createCard,
  fetchBoards,
  fetchCards,
  fetchLists,
  updateCard,
} from '../services/trello-api';
import { findOrCreateKanbanForBoard } from '../sync/find-or-create-kanban';
import { pushBoardCards, reconcileBoardCards } from '../sync/sync-board';
import { SyncTrelloBoard } from './definitions';

/**
 * Reconciles cards for currently-selected Trello targets on the Integration.
 *
 * Pull-then-push on each target. Failure on one target writes lastError on
 * that target only and continues with the next. Targets are processed in
 * parallel up to `TARGET_CONCURRENCY` to overlap network round-trips while
 * staying within Trello's per-token rate limits.
 *
 * TODO(integration-sync): the per-target orchestration below — filter targets,
 * `Effect.forEach` with concurrency, `Effect.either` per target, write
 * `lastSyncAt`/`lastError` back into the integration — is generic across
 * service plugins. When a second service plugin (plugin-linear-issues,
 * plugin-github, ...) lands and copies this shape, extract a
 * `runIntegrationSync(integration, { selectTarget, perTarget, concurrency })`
 * helper into `@dxos/plugin-integration/src/sync/run-integration-sync.ts`.
 * The Trello-specific bits (board id lookup, fetch+reconcile+push) stay here
 * as the per-target closure.
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
        return yield* Effect.fail(new Error('No database for integration ref'));
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
      const allBoards = yield* fetchBoards();
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
        entry: typeof integrationObj.targets[number];
        kanban: Kanban.Kanban;
        boardId: string;
        remoteBoard: typeof allBoards[number];
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
        if (foreignId === undefined) continue;
        const remoteBoard = boardsById.get(foreignId);
        if (!remoteBoard) continue;

        // Materialize the local Kanban if we don't have one yet, and write
        // the ref back into the target so subsequent syncs skip this branch.
        if (!localObj) {
          localObj = yield* findOrCreateKanbanForBoard(remoteBoard);
          const materializedRef = Ref.make(localObj);
          Obj.change(integrationObj, (mutableObj) => {
            const mutable = mutableObj as Obj.Mutable<typeof mutableObj>;
            const idx = mutable.targets.findIndex((t) => t.remoteId === foreignId);
            if (idx >= 0) {
              mutable.targets[idx] = { ...mutable.targets[idx], object: materializedRef };
            }
          });
        }

        const targetEchoId = Ref.make(localObj).dxn.asEchoDXN()?.echoId;
        if (kanbanFilterId && targetEchoId !== kanbanFilterId) continue;
        if (!Obj.instanceOf(Kanban.Kanban, localObj)) continue;
        if (!Kanban.isKanbanItems(localObj)) continue;

        targetEntries.push({ entry: target, kanban: localObj, boardId: foreignId, remoteBoard });
      }

      const perTarget = yield* Effect.forEach(
        targetEntries,
        ({ kanban: targetKanban, boardId, remoteBoard }) =>
          Effect.gen(function* () {
            const result = yield* Effect.either(
              Effect.gen(function* () {
                // The trello-api functions return `Effect<T, HttpClientError, HttpClient>`
                // with retry+timeout baked in. The HttpClient layer is provided at the
                // operation boundary below. Trello's cards endpoint doesn't support a
                // delta cursor, so we full-fetch every sync and don't read/write
                // `target.cursor` here.
                const lists = yield* fetchLists(boardId);
                const cards = yield* fetchCards(boardId);
                const reconcileResult = yield* reconcileBoardCards(
                  integrationObj,
                  targetKanban,
                  remoteBoard,
                  cards,
                  lists,
                );

                const pushResult = yield* pushBoardCards(integrationObj, targetKanban, lists, {
                  create: ({ listId, name, desc }) =>
                    createCard({ idList: listId, name, desc }).pipe(
                      Effect.map((card) => ({ id: card.id })),
                      Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))),
                    ),
                  update: (foreignId, payload) =>
                    updateCard(foreignId, {
                      name: payload.name,
                      desc: payload.desc,
                      idList: payload.listId,
                    }).pipe(
                      Effect.map(() => undefined),
                      Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))),
                    ),
                });

                return { reconcileResult, pushResult };
              }),
            );

            // Update the target entry in place with success/failure status.
            // Match by `remoteId` (stable across runs) with a fallback to
            // local-object echo id for legacy entries that lack `remoteId`.
            Obj.change(integrationObj, (integrationObj) => {
              const m = integrationObj as Obj.Mutable<typeof integrationObj>;
              const idx = m.targets.findIndex((t) => {
                if (t.remoteId !== undefined) return t.remoteId === boardId;
                const localId = t.object?.target ? Obj.getMeta(t.object.target).keys.find((k) => k.source === TRELLO_SOURCE)?.id : undefined;
                return localId === boardId;
              });
              if (idx < 0) return;
              if (result._tag === 'Right') {
                m.targets[idx] = {
                  ...m.targets[idx],
                  lastSyncAt: new Date().toISOString(),
                  lastError: undefined,
                };
              } else {
                m.targets[idx] = {
                  ...m.targets[idx],
                  lastError: String((result.left as Error).message ?? result.left),
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
        if (!r) continue;
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
          Effect.provide(TrelloCredentials.fromIntegration(integration)),
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
        const message = String((outcome.left as Error)?.message ?? outcome.left);
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
