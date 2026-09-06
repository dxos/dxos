//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as PubSub from 'effect/PubSub';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { clientLayer } from '../internal/sqlite.ts';
import * as Events from './Events.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';

/**
 * The append-only project log. Everything a session accumulates — the chat transcript, what the
 * canvas shows, the project's own title — is a fold over these events, so there is no second copy
 * to keep in step. Appends are serialized through one fiber-safe sequence per project, and every
 * appended entry is published so a live UI folds the same stream a reload replays.
 */

export class LogError extends Data.TaggedError('code-index/LogError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type Project = {
  readonly id: string;
  readonly title: string;
  readonly created: number;
};

export interface Api {
  readonly createProject: (options?: {
    readonly id?: string;
    readonly title?: string;
  }) => Effect.Effect<Project, LogError>;
  readonly listProjects: () => Effect.Effect<Project[], LogError>;
  readonly getProject: (id: string) => Effect.Effect<Project | undefined, LogError>;
  /** The project touched last — what a reload with no id in the URL opens. */
  readonly lastProject: () => Effect.Effect<Project | undefined, LogError>;
  /** Appends one event and returns the entry it became. */
  readonly append: (projectId: string, event: Events.Event) => Effect.Effect<Events.Entry, LogError>;
  /** The whole log from `after` (exclusive), in sequence order. */
  readonly read: (projectId: string, after?: number) => Effect.Effect<Events.Entry[], LogError>;
  /**
   * The log from `after` (exclusive) and then everything appended afterwards. Replay and live tail
   * are one stream, so a subscriber has no gap to reconcile.
   */
  readonly stream: (projectId: string, after?: number) => Stream.Stream<Events.Entry, LogError>;

  // The sandbox's key/value store. JSON on the wire in both directions; the caller owns the shape.
  readonly getValue: (projectId: string, key: string) => Effect.Effect<string | undefined, LogError>;
  readonly setValue: (projectId: string, key: string, value: string) => Effect.Effect<void, LogError>;
  readonly listKeys: (projectId: string) => Effect.Effect<string[], LogError>;
}

export class Log extends Context.Service<Log, Api>()('code-index/Log') {}

const SQLITE_FILE = 'workspace.sqlite';

const fail = (message: string) => (cause: unknown) => new LogError({ message, cause });

const encodeEvent = Schema.encodeUnknownEffect(Events.Event);
const decodeEvent = Schema.decodeUnknownEffect(Events.Event);

/** Sortable and short — the id appears in the webui URL. */
const newId = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const make = (): Effect.Effect<Api, LogError, SqlClient.SqlClient | Scope.Scope> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(Effect.orDie);

    // One hub for every project: a subscriber filters by id, which costs nothing at this volume and
    // spares the store a per-project registry to garbage-collect.
    const hub = yield* PubSub.unbounded<Events.Entry>();
    // Appends must not interleave — two fibers reading the same `MAX(seq)` would collide on the
    // primary key — so the whole read-compute-insert is taken under one semaphore.
    const gate = yield* Semaphore.make(1);

    const getProject: Api['getProject'] = (id) =>
      sql<Project>`SELECT id, title, created FROM projects WHERE id = ${id}`.pipe(
        Effect.map((rows) => rows[0]),
        Effect.mapError(fail('Failed to read project')),
      );

    const read: Api['read'] = (projectId, after = 0) =>
      Effect.gen(function* () {
        const rows = yield* sql<{
          seq: number;
          data: string;
        }>`SELECT seq, data FROM events WHERE project_id = ${projectId} AND seq > ${after} ORDER BY seq`.pipe(
          Effect.mapError(fail('Failed to read events')),
        );
        return yield* Effect.forEach(rows, (row) =>
          decodeEvent(JSON.parse(row.data)).pipe(
            Effect.map((event): Events.Entry => ({ projectId, seq: row.seq, event })),
            Effect.mapError(fail(`Failed to decode event ${projectId}/${row.seq}`)),
          ),
        );
      });

    const append: Api['append'] = (projectId, event) =>
      Effect.gen(function* () {
        const encoded = yield* encodeEvent(event).pipe(Effect.mapError(fail('Failed to encode event')));
        const [{ next }] = yield* sql<{
          next: number;
        }>`SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM events WHERE project_id = ${projectId}`.pipe(
          Effect.mapError(fail('Failed to read log head')),
        );
        yield* sql`INSERT INTO events (project_id, seq, type, data)
                   VALUES (${projectId}, ${next}, ${event._tag}, ${JSON.stringify(encoded)})`.pipe(
          Effect.mapError(fail('Failed to append event')),
        );
        const entry: Events.Entry = { projectId, seq: next, event };
        yield* PubSub.publish(hub, entry);
        return entry;
      }).pipe(Semaphore.withPermits(gate, 1));

    return {
      createProject: ({ id = newId(), title = 'Untitled' } = {}) =>
        Effect.gen(function* () {
          const created = Date.now();
          yield* sql`INSERT INTO projects (id, title, created) VALUES (${id}, ${title}, ${created})
                     ON CONFLICT (id) DO NOTHING`.pipe(Effect.mapError(fail('Failed to create project')));
          const project = yield* getProject(id);
          if (!project) {
            return yield* Effect.fail(new LogError({ message: `Project vanished after creation: ${id}` }));
          }
          return project;
        }),

      listProjects: () =>
        sql<Project>`SELECT id, title, created FROM projects ORDER BY created DESC`.pipe(
          Effect.map((rows) => [...rows]),
          Effect.mapError(fail('Failed to list projects')),
        ),

      getProject,

      // Ordered by the last event rather than by creation: "last opened" is what the user did with
      // a project, not when it appeared.
      lastProject: () =>
        sql<Project>`SELECT p.id, p.title, p.created FROM projects p
                     LEFT JOIN events e ON e.project_id = p.id
                     GROUP BY p.id
                     ORDER BY COALESCE(MAX(e.seq), 0) > 0 DESC, MAX(e.rowid) DESC, p.created DESC
                     LIMIT 1`.pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(fail('Failed to read last project')),
        ),

      append,
      read,

      getValue: (projectId, key) =>
        sql<{ value: string }>`SELECT value FROM storage WHERE project_id = ${projectId} AND key = ${key}`.pipe(
          Effect.map((rows) => rows[0]?.value),
          Effect.mapError(fail('Failed to read stored value')),
        ),

      setValue: (projectId, key, value) =>
        sql`INSERT INTO storage (project_id, key, value) VALUES (${projectId}, ${key}, ${value})
            ON CONFLICT (project_id, key) DO UPDATE SET value = excluded.value`.pipe(
          Effect.asVoid,
          Effect.mapError(fail('Failed to write stored value')),
        ),

      listKeys: (projectId) =>
        sql<{ key: string }>`SELECT key FROM storage WHERE project_id = ${projectId} ORDER BY key`.pipe(
          Effect.map((rows) => rows.map((row) => row.key)),
          Effect.mapError(fail('Failed to list stored keys')),
        ),

      stream: (projectId, after = 0) =>
        // Subscribing before the replay read is what closes the gap: an event appended while the
        // history is being read is already in the subscription, and the `seq` filter drops the
        // duplicate rather than losing it.
        Stream.unwrap(
          Effect.gen(function* () {
            const subscription = yield* PubSub.subscribe(hub);
            const history = yield* read(projectId, after);
            const head = history.at(-1)?.seq ?? after;
            return Stream.concat(
              Stream.fromIterable(history),
              Stream.fromSubscription(subscription).pipe(
                Stream.filter((entry) => entry.projectId === projectId && entry.seq > head),
              ),
            );
          }),
        ),
    } satisfies Api;
  });

/** Opens (creating if absent) the workspace log inside `dir` — beside the code index, not in it. */
export const layer = (dir: string): Layer.Layer<Log, LogError> =>
  Layer.unwrap(
    Effect.map(
      Effect.tryPromise({
        try: () => mkdir(dir, { recursive: true }),
        catch: fail('Failed to create store directory'),
      }),
      () => Layer.effect(Log, make()).pipe(Layer.provide(clientLayer(join(dir, SQLITE_FILE)))),
    ),
  );
