//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
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
      const store = yield* Store.Store;
      const log = yield* Log.Log;
      const agent = yield* Agent.Agent;

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
            ? // The turn appends the user's message itself, and runs detached: a request that
              // waited for it would hold the connection open for a minute of tool calls.
              agent.turn({ projectId, text: event.text }).pipe(Effect.forkDetach, Effect.asVoid)
            : log.append(projectId, event).pipe(
                Effect.asVoid,
                Effect.mapError((cause) => failure(cause.message)),
              ),

        Watch: ({ projectId, after }: { projectId: string; after?: number }) =>
          log.stream(projectId, after).pipe(Stream.mapError((cause) => failure(cause.message))),
      };
    }),
  );
