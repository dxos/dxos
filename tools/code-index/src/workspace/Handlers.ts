//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FiberSet from 'effect/FiberSet';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';

import * as Store from '../Store.ts';
import * as Agent from './Agent.ts';
import * as Events from './Events.ts';
import * as IndexStatus from './IndexStatus.ts';
import * as Log from './Log.ts';
import type * as Models from './Models.ts';
import * as Protocol from './Protocol.ts';
import * as Titles from './Titles.ts';

/**
 * The server side of the protocol. A `Dispatch` of a `UserMessage` is the one call that does work:
 * it forks a turn and returns immediately, because the turn's output reaches the client down the
 * `Watch` stream it is already holding. Every other event is appended and nothing else — the UI's
 * macro commands are facts about the project, not requests for behaviour. A project's first prompt
 * also names it, on a side call that never holds up the turn.
 */

const failure = (message: string) => new Protocol.RequestFailed({ message });

export const layer = (options: { readonly root: string; readonly model: Models.Selection }) =>
  Protocol.Rpcs.toLayer(
    Effect.gen(function* () {
      // Turns are forked into the layer's scope, so shutdown interrupts a running one before the
      // store it queries is closed under it.
      const scope = yield* Effect.scope;
      const store = yield* Store.Store;
      const log = yield* Log.Log;
      const agent = yield* Agent.Agent;
      const titles = yield* Titles.Titles;
      const index = yield* IndexStatus.IndexStatus;
      // Counted now so the UI's first `Info` skips the native store's one full scan; a failure resurfaces there.
      yield* store.stats().pipe(Effect.ignore, Effect.forkIn(scope));

      /**
       * One turn at a time per project. The log serializes individual appends, not turns, so two
       * overlapping turns would each fold a different prefix of the transcript and interleave their
       * replies — and nothing downstream could tell which answer belonged to which question. A
       * second prompt therefore queues behind the first rather than racing it.
       */
      const turns = new Map<string, Semaphore.Semaphore>();
      const gateFor = (projectId: string) =>
        Effect.gen(function* () {
          const existing = turns.get(projectId);
          if (existing) {
            return existing;
          }
          const created = yield* Semaphore.make(1);
          turns.set(projectId, created);
          return created;
        });

      /** Each project's running turns and naming call, so deleting it can stop them first. */
      const work = new Map<string, FiberSet.FiberSet>();
      const workFor = (projectId: string) =>
        Effect.gen(function* () {
          const existing = work.get(projectId);
          if (existing) {
            return existing;
          }
          // In the layer's scope, so shutdown interrupts every turn before the store closes.
          const created = yield* FiberSet.make().pipe(Effect.provideService(Scope.Scope, scope));
          work.set(projectId, created);
          return created;
        });

      /** Projects with a naming call in flight; a second prompt sent before the first lands must not name again. */
      const naming = new Set<string>();

      /**
       * Whether `text` should name the project: it is the first prompt and nothing has named it.
       * Asked before the turn is forked, while the log cannot yet hold this prompt, and claimed at
       * once so a second prompt sent before the first is logged does not name it again.
       */
      const claimNaming = (projectId: string) =>
        Effect.gen(function* () {
          if (naming.has(projectId)) {
            return false;
          }
          naming.add(projectId);
          const project = yield* log.getProject(projectId);
          const eligible = project !== undefined && Titles.unnamed(project.title, yield* log.read(projectId));
          if (!eligible) {
            naming.delete(projectId);
          }
          return eligible;
        }).pipe(Effect.onError(() => Effect.sync(() => naming.delete(projectId))));

      /** Writes the title unless the user renamed the project while the model was thinking. */
      const autoName = (projectId: string, text: string) =>
        Effect.gen(function* () {
          const title = yield* titles.name(text);
          const entries = yield* log.read(projectId);
          if (!entries.some((entry) => entry.event._tag === 'TitleSet')) {
            yield* log.append(projectId, new Events.TitleSet({ title }));
          }
        }).pipe(
          Effect.catch((cause) => Console.error(`code-index · cannot name project: ${cause.message}`)),
          Effect.ensuring(Effect.sync(() => naming.delete(projectId))),
        );

      return {
        Info: () =>
          Effect.all([store.stats(), index.declarations()]).pipe(
            Effect.map(
              ([stats, declarations]) =>
                new Protocol.ServerInfo({
                  root: options.root,
                  provider: options.model.provider,
                  model: options.model.model,
                  quads: stats.quads,
                  files: stats.files,
                  declarations,
                }),
            ),
            Effect.mapError((cause) => failure(cause.message)),
          ),

        ListProjects: () =>
          log.listProjects().pipe(
            Effect.map((projects) => projects.map((project) => new Protocol.ProjectRecord(project))),
            Effect.mapError((cause) => failure(cause.message)),
          ),

        CreateProject: ({ title }: { title?: string }) =>
          log.createProject({ title }).pipe(
            Effect.map((project) => new Protocol.ProjectRecord(project)),
            Effect.mapError((cause) => failure(cause.message)),
          ),

        DeleteProject: ({ projectId }: { projectId: string }) =>
          Effect.gen(function* () {
            // Stopped before the rows go, or an interrupted turn's closing event would re-create the log.
            const running = work.get(projectId);
            if (running) {
              yield* FiberSet.clear(running);
              work.delete(projectId);
            }
            turns.delete(projectId);
            return yield* log.deleteProject(projectId);
          }).pipe(Effect.mapError((cause) => failure(cause.message))),

        Dispatch: ({ projectId, event }: { projectId: string; event: Events.Event }) =>
          event._tag === 'UserMessage'
            ? // The turn appends the user's message itself, and runs apart from the request: a request
              // that waited would hold the connection open for a minute of tool calls. Detached but not
              // unordered — it takes the project's turn gate first, so a prompt sent while another
              // turn is running waits for it rather than interleaving with it. Naming is checked
              // before the turn is forked, while the log still shows whether this is the first prompt.
              Effect.gen(function* () {
                const fibers = yield* workFor(projectId);
                const gate = yield* gateFor(projectId);
                if (yield* claimNaming(projectId).pipe(Effect.orElseSucceed(() => false))) {
                  yield* FiberSet.run(fibers, autoName(projectId, event.text));
                }
                yield* FiberSet.run(
                  fibers,
                  agent
                    .turn({ projectId, text: event.text, turnId: event.turnId })
                    .pipe(Semaphore.withPermits(gate, 1)),
                );
              })
            : log.append(projectId, event).pipe(
                Effect.asVoid,
                Effect.mapError((cause) => failure(cause.message)),
              ),

        Watch: ({ projectId, after }: { projectId: string; after?: number }) =>
          log.stream(projectId, after).pipe(Stream.mapError((cause) => failure(cause.message))),

        WatchIndex: () => index.changes,
      };
    }),
  );
