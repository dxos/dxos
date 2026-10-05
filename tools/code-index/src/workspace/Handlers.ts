//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';

import * as Store from '../Store.ts';
import * as Agent from './Agent.ts';
import * as Events from './Events.ts';
import * as Log from './Log.ts';
import type * as Models from './Models.ts';
import * as Protocol from './Protocol.ts';

/**
 * The server side of the protocol. A `Dispatch` of a `UserMessage` is the one call that does work:
 * it forks a turn and returns immediately, because the turn's output reaches the client down the
 * `Watch` stream it is already holding. Every other event is appended and nothing else — the UI's
 * macro commands are facts about the project, not requests for behaviour.
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

      return {
        Info: () =>
          store.stats().pipe(
            Effect.map(
              (stats) =>
                new Protocol.ServerInfo({
                  root: options.root,
                  provider: options.model.provider,
                  model: options.model.model,
                  quads: stats.quads,
                  files: stats.files,
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

        Dispatch: ({ projectId, event }: { projectId: string; event: Events.Event }) =>
          event._tag === 'UserMessage'
            ? // The turn appends the user's message itself, and runs apart from the request: a request
              // that waited would hold the connection open for a minute of tool calls. Detached but not
              // unordered — it takes the project's turn gate first, so a prompt sent while another
              // turn is running waits for it rather than interleaving with it.
              gateFor(projectId).pipe(
                Effect.flatMap((gate) =>
                  agent
                    .turn({ projectId, text: event.text, turnId: event.turnId })
                    .pipe(Semaphore.withPermits(gate, 1), Effect.forkIn(scope), Effect.asVoid),
                ),
              )
            : log.append(projectId, event).pipe(
                Effect.asVoid,
                Effect.mapError((cause) => failure(cause.message)),
              ),

        Watch: ({ projectId, after }: { projectId: string; after?: number }) =>
          log.stream(projectId, after).pipe(Stream.mapError((cause) => failure(cause.message))),
      };
    }),
  );
