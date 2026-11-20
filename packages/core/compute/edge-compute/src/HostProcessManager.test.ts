//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as HttpServerRequest from 'effect/http/HttpServerRequest';
import * as HttpServerResponse from 'effect/http/HttpServerResponse';
import * as Layer from 'effect/Layer';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as RpcServer from 'effect/rpc/RpcServer';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { SpaceId } from '@dxos/keys';

import * as HostProcessManager from './HostProcessManager.ts';

const spaceId = SpaceId.random();
const pid = Process.ID.make('01JZ0000000000000000000000');

const info = (state = 'RUNNING') => ({
  pid,
  parentPid: null,
  key: 'org.dxos.edge.process.coding-agent',
  params: { name: 'Claude Code', annotations: {} },
  environment: { space: spaceId },
  state,
  alarmDueAt: null,
  error: null,
  startedAt: 1,
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
});

class Echo extends RpcGroup.make(
  Rpc.make('echo', { payload: { text: Schema.String }, success: Schema.Struct({ echoed: Schema.String }) }),
) {}

const EchoHandlers = Echo.toLayer({ echo: ({ text }) => Effect.succeed({ echoed: text.toUpperCase() }) });

/** Serves the process's RPC group the way EDGE's process host does, from a request body. */
const serve = (body: string, contentType: string | null) =>
  Effect.gen(function* () {
    const app = yield* RpcServer.toHttpEffect(Echo);
    const web = HttpServerResponse.toWeb(yield* app);
    return {
      status: web.status,
      contentType: web.headers.get('content-type') ?? undefined,
      body: yield* Effect.promise(() => web.text()),
    };
  }).pipe(
    Effect.provide(Layer.mergeAll(EchoHandlers, RpcSerialization.layerNdjson)),
    Effect.provideService(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(
        new Request('https://process.internal/rpc', {
          method: 'POST',
          body,
          headers: contentType === null ? {} : { 'content-type': contentType },
        }),
      ),
    ),
    Effect.scoped,
  );

const makeHost = () => {
  const calls: { method: string; args: readonly unknown[] }[] = [];
  const record = (method: string, args: readonly unknown[]) => calls.push({ method, args });
  const host: HostProcessManager.Host = {
    spawn: (...args) => Effect.sync(() => (record('spawn', args), info('STARTING'))),
    submitInput: (...args) => Effect.sync(() => (record('submitInput', args), info())),
    list: (...args) => Effect.sync(() => (record('list', args), [info(), info('TERMINATED')])),
    status: (...args) => Effect.sync(() => (record('status', args), info())),
    terminate: (...args) => Effect.sync(() => (record('terminate', args), { terminated: true })),
    readEvents: (...args) =>
      Effect.sync(() => {
        record('readEvents', args);
        return {
          events: [{ _tag: 'output', seq: 0, data: { hello: 'world' } }],
          cursor: 1,
          truncated: false,
          info: info(),
        };
      }),
    rpc: (...args) => {
      record('rpc', args);
      const [, body, contentType] = args;
      return typeof body === 'string' && (typeof contentType === 'string' || contentType === null)
        ? serve(body, contentType)
        : Effect.die('the rpc call carries no body');
    },
  };
  return { host, calls };
};

describe('HostProcessManager', () => {
  it.effect('spawns, submits and reads through the host, decoding what it answers', () =>
    Effect.gen(function* () {
      const { host, calls } = makeHost();
      const control = HostProcessManager.makeControl(host);

      const snapshot = yield* control.spawn({
        spaceId,
        key: 'org.dxos.edge.process.coding-agent',
        name: 'Claude Code',
        idempotencyKey: 'claude-code-edge:chat',
      });
      expect(snapshot.pid).toBe(pid);
      expect(calls[0]).toEqual({
        method: 'spawn',
        args: [
          { key: 'org.dxos.edge.process.coding-agent', name: 'Claude Code', idempotencyKey: 'claude-code-edge:chat' },
        ],
      });

      yield* control.submitInput({ spaceId, pid: snapshot.pid, input: { _tag: 'prompt' }, idempotencyKey: 'turn-1' });
      expect(calls[1]).toEqual({ method: 'submitInput', args: [pid, { _tag: 'prompt' }, 'turn-1'] });

      const page = yield* control.readEvents({ spaceId, pid: snapshot.pid, cursor: 0 });
      expect(page.cursor).toBe(1);
      expect(page.events).toEqual([{ _tag: 'output', seq: 0, data: { hello: 'world' } }]);
    }),
  );

  it.effect("drives the process's RPC group across the host service", () =>
    Effect.gen(function* () {
      const { host } = makeHost();
      const control = HostProcessManager.makeControl(host);
      const client = yield* control.makeRpcClient({ spaceId, pid, group: Echo });
      expect(yield* client.echo({ text: 'lend' })).toEqual({ echoed: 'LEND' });
    }).pipe(Effect.scoped),
  );

  it.effect('lists by key, filters by state, reads status and terminates through the host', () =>
    Effect.gen(function* () {
      const { host, calls } = makeHost();
      const control = HostProcessManager.makeControl(host);

      const listed = yield* control.list({
        spaceId,
        key: 'org.dxos.edge.process.coding-agent',
        state: Process.State.RUNNING,
      });
      expect(listed.map(({ state }) => state)).toEqual(['RUNNING']);
      expect(calls[0]).toEqual({ method: 'list', args: [{ key: 'org.dxos.edge.process.coding-agent' }] });

      // The host filters by key only; a target the host cannot see is applied to what it answers.
      expect(yield* control.list({ spaceId, target: 'echo://chat' })).toEqual([]);

      expect((yield* control.status({ spaceId, pid })).pid).toBe(pid);
      expect(calls[2]).toEqual({ method: 'status', args: [pid] });

      yield* control.terminate({ spaceId, pid });
      expect(calls[3]).toEqual({ method: 'terminate', args: [pid, null] });
    }),
  );

  it.effect('serves Process.ManagerService for EDGE locations and refuses local ones', () =>
    Effect.gen(function* () {
      const { host, calls } = makeHost();
      const manager = HostProcessManager.make(host, Registry.make());
      // The handler never runs here: a remote spawn sends only the key.
      const definition = Operation.makeDurable({
        key: 'org.dxos.edge.process.coding-agent',
        input: Schema.Unknown,
        output: Schema.Unknown,
        services: [],
      }).pipe(Operation.withDurableHandler(() => Effect.succeed({})));

      const process = yield* manager.spawn(definition, {
        location: { kind: 'edge', space: spaceId },
        name: 'Claude Code',
      });
      expect(process.pid).toBe(pid);
      expect(calls[0]).toMatchObject({
        method: 'spawn',
        args: [{ key: 'org.dxos.edge.process.coding-agent', name: 'Claude Code' }],
      });

      const listed = yield* manager.list({ space: spaceId });
      expect(listed.map(({ pid }) => pid)).toEqual([pid, pid]);

      const local = yield* manager.spawn(definition).pipe(Effect.exit);
      expect(local._tag).toBe('Failure');
    }),
  );

  it.effect('refuses a child process, which the host cannot parent', () =>
    Effect.gen(function* () {
      const { host, calls } = makeHost();
      const exit = yield* HostProcessManager.makeControl(host)
        .spawn({ spaceId, key: 'org.dxos.edge.process.coding-agent', parentPid: pid })
        .pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
      expect(calls).toEqual([]);
    }),
  );

  it.effect('dies on an answer that is not a process', () =>
    Effect.gen(function* () {
      const control = HostProcessManager.makeControl({ spawn: () => Effect.succeed({ nope: true }) });
      const exit = yield* control.spawn({ spaceId, key: 'k' }).pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
    }),
  );
});
