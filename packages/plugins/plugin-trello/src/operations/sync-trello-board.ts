//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Kanban } from '@dxos/plugin-kanban/types';

import { meta } from '#meta';

import { TRELLO_SOURCE } from '../constants';
import {
  createCard,
  credentialsFromAccessToken,
  fetchBoards,
  fetchCards,
  fetchLists,
  updateCard,
} from '../services/trello-api';
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
        const accessToken = yield* Database.load(integrationObj.accessToken);
        const creds = credentialsFromAccessToken(accessToken);

      // Fetch the user's boards once so each target can look up its remote
      // `TrelloBoard` (for board-level fields like `name`). One round-trip
      // regardless of target count, and we already know `fetchBoards` is part
      // of the surface area used by `GetTrelloBoards`.
      const allBoards = yield* fetchBoards(creds);
      const boardsById = new Map(allBoards.map((b) => [b.id, b]));

      // Determine which target entries to process: items-variant Kanbans with a
      // Trello foreign key. The integration mechanism only ever creates this shape
      // for Trello, so view-variant Kanbans here would be a programmer error; we
      // filter them out rather than cast past the union later.
      // Stored target refs use the space-relative form (`dxn:echo:@:...`); the
      // input `kanbanRef` may be absolute. Compare by echo id to be tolerant.
      const kanbanFilterId = kanbanRef?.dxn.asEchoDXN()?.echoId;
      const targetEntries = integrationObj.targets.flatMap((target) => {
        const targetObj = target.object.target;
        const targetEchoId = target.object.dxn.asEchoDXN()?.echoId;
        if (!targetObj) return [];
        if (kanbanFilterId && targetEchoId !== kanbanFilterId) return [];
        if (!Obj.instanceOf(Kanban.Kanban, targetObj)) return [];
        if (!Kanban.isKanbanItems(targetObj)) return [];
        const foreignId = Obj.getMeta(targetObj).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
        if (foreignId === undefined) return [];
        const remoteBoard = boardsById.get(foreignId);
        if (!remoteBoard) return [];
        return [{ entry: target, kanban: targetObj, boardId: foreignId, remoteBoard }];
      });

      const perTarget = yield* Effect.forEach(
        targetEntries,
        ({ entry: target, kanban: targetKanban, boardId, remoteBoard }) =>
          Effect.gen(function* () {
            const result = yield* Effect.either(
              Effect.gen(function* () {
                // The trello-api functions return `Effect<T, HttpClientError, HttpClient>`
                // with retry+timeout baked in. The HttpClient layer is provided at the
                // operation boundary below. Trello's cards endpoint doesn't support a
                // delta cursor, so we full-fetch every sync and don't read/write
                // `target.cursor` here.
                const lists = yield* fetchLists(boardId, creds);
                const cards = yield* fetchCards(boardId, creds);
                const reconcileResult = yield* reconcileBoardCards(
                  integrationObj,
                  targetKanban,
                  remoteBoard,
                  cards,
                  lists,
                );

                const pushResult = yield* pushBoardCards(integrationObj, targetKanban, lists, {
                  create: ({ listId, name, desc }) =>
                    createCard(creds, { idList: listId, name, desc }).pipe(
                      Effect.map((card) => ({ id: card.id })),
                      Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))),
                    ),
                  update: (foreignId, payload) =>
                    updateCard(creds, foreignId, {
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
            Obj.change(integrationObj, (integrationObj) => {
              const m = integrationObj as Obj.Mutable<typeof integrationObj>;
              const idx = m.targets.findIndex((t) => t.object.dxn.toString() === target.object.dxn.toString());
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
        }).pipe(Effect.provide(Database.layer(db))),
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
