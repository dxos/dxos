//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as RpcTest from 'effect/rpc/RpcTest';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Store from '../Store.ts';
import * as Agent from './Agent.ts';
import * as Events from './Events.ts';
import * as Handlers from './Handlers.ts';
import * as IndexStatus from './IndexStatus.ts';
import * as Log from './Log.ts';
import * as Protocol from './Protocol.ts';
import * as Titles from './Titles.ts';

/**
 * The RPC handlers against a real log and store, with a stand-in agent whose turn records the prompt
 * and then runs until interrupted — the shape of a turn the user deletes mid-answer.
 */

/** Records the prompt, runs until interrupted, and closes the turn on the way out as the real agent does. */
const hangingAgent = Layer.effect(
  Agent.Agent,
  Effect.gen(function* () {
    const log = yield* Log.Log;
    return {
      turn: ({ projectId, text, turnId }) =>
        log.append(projectId, new Events.UserMessage({ text, turnId })).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() =>
            log.append(projectId, new Events.TurnFailed({ message: 'Interrupted.', turnId })).pipe(Effect.ignore),
          ),
          Effect.mapError((cause) => new Agent.AgentError({ message: cause.message })),
        ),
    } satisfies Agent.Api;
  }),
);

const makeClient = RpcTest.makeClient(Protocol.Rpcs);

type Client = Effect.Success<typeof makeClient>;

describe('Handlers', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-handlers-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** Runs `body` with an in-memory client of the protocol, served by the real handlers. */
  const withClient = <A, E>(body: (client: Client, log: Log.Api) => Effect.Effect<A, E>): Promise<A> => {
    const stores = Layer.merge(Store.layer(dir), Log.layer(dir));
    const services = Layer.mergeAll(
      stores,
      hangingAgent.pipe(Layer.provide(stores)),
      Titles.fallbackLayer,
      IndexStatus.layer({ watching: false }).pipe(Layer.provide(stores)),
    );
    const handlers = Handlers.layer({ root: dir, model: { provider: 'ollama', model: 'test' } }).pipe(
      Layer.provideMerge(services),
    );
    return EffectEx.runPromise(
      Effect.gen(function* () {
        const client = yield* makeClient;
        return yield* body(client, yield* Log.Log);
      }).pipe(Effect.provide(handlers), Effect.scoped),
    );
  };

  /** Polls until `check` holds; the naming side call and the forked turn finish on their own fibers. */
  const eventually = <E>(check: Effect.Effect<boolean, E>) =>
    check.pipe(
      Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail('not yet' as const))),
      Effect.retry({ schedule: Schedule.spaced('10 millis'), times: 300 }),
    );

  test('the first prompt names the project; a later prompt does not rename it', async ({ expect }) => {
    const titles = await withClient((client) =>
      Effect.gen(function* () {
        const project = yield* client.CreateProject({});
        yield* client.Dispatch({
          projectId: project.id,
          event: new Events.UserMessage({ text: 'which packages depend on echo?' }),
        });
        const titled = client
          .ListProjects()
          .pipe(Effect.map((projects) => projects.find((candidate) => candidate.id === project.id)?.title));
        yield* eventually(Effect.map(titled, (title) => title !== Titles.UNTITLED));
        const first = yield* titled;
        yield* client.Dispatch({ projectId: project.id, event: new Events.UserMessage({ text: 'and on halo?' }) });
        return [first, yield* titled];
      }),
    );
    expect(titles).toEqual(['Which packages depend on echo', 'Which packages depend on echo']);
  });

  test('a project the user named keeps its name through the first prompt', async ({ expect }) => {
    const entries = await withClient((client, log) =>
      Effect.gen(function* () {
        const project = yield* client.CreateProject({});
        yield* client.Dispatch({ projectId: project.id, event: new Events.TitleSet({ title: 'Mine' }) });
        yield* client.Dispatch({ projectId: project.id, event: new Events.UserMessage({ text: 'hello there' }) });
        yield* eventually(
          Effect.map(log.read(project.id), (read) => read.some((entry) => entry.event._tag === 'UserMessage')),
        );
        return [(yield* log.getProject(project.id))?.title, yield* log.read(project.id)] as const;
      }),
    );
    expect(entries[0]).toBe('Mine');
    expect(entries[1].filter((entry) => entry.event._tag === 'TitleSet')).toHaveLength(1);
  });

  test('deleting a project stops its turn and removes its log', async ({ expect }) => {
    const result = await withClient((client, log) =>
      Effect.gen(function* () {
        const kept = yield* client.CreateProject({ title: 'Kept' });
        const doomed = yield* client.CreateProject({});
        yield* client.Dispatch({ projectId: doomed.id, event: new Events.UserMessage({ text: 'long question' }) });
        // The turn is running and the naming call has written its title.
        yield* eventually(
          Effect.map(log.read(doomed.id), (read) => read.some((entry) => entry.event._tag === 'TitleSet')),
        );
        const deleted = yield* client.DeleteProject({ projectId: doomed.id });
        const again = yield* client.DeleteProject({ projectId: doomed.id });
        return {
          deleted,
          again,
          projects: (yield* client.ListProjects()).map((project) => project.id),
          // The interrupted turn's closing event must not have re-created the log after the delete.
          remaining: yield* log.read(doomed.id),
          kept: kept.id,
        };
      }),
    );
    expect(result.deleted).toBe(true);
    expect(result.again).toBe(false);
    expect(result.projects).toEqual([result.kept]);
    expect(result.remaining).toEqual([]);
  });

  test('the index status stream opens with the current state and Info carries the declaration count', async ({
    expect,
  }) => {
    const [status, info] = await withClient((client) =>
      Effect.gen(function* () {
        const status = yield* client.WatchIndex().pipe(Stream.take(1), Stream.runCollect);
        yield* eventually(Effect.map(client.Info(), (info) => info.declarations !== undefined));
        return [status, yield* client.Info()] as const;
      }),
    );
    expect(status[0]?.state).toEqual({ _tag: 'Static' });
    expect(info.declarations).toBe(0);
  });
});
