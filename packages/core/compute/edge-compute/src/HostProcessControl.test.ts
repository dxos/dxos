//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as HttpServerRequest from 'effect/http/HttpServerRequest';
import * as HttpServerResponse from 'effect/http/HttpServerResponse';
import * as Layer from 'effect/Layer';
import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as RpcServer from 'effect/rpc/RpcServer';
import * as Schema from 'effect/Schema';

import * as Process from '@dxos/compute/Process';
import { SpaceId } from '@dxos/keys';

import * as HostProcessControl from './HostProcessControl.ts';

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
  const host: HostProcessControl.Host = {
    spawn: (...args) => Effect.sync(() => (record('spawn', args), info('STARTING'))),
    submitInput: (...args) => Effect.sync(() => (record('submitInput', args), info())),
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

describe('HostProcessControl', () => {
  it.effect('spawns, submits and reads through the host, decoding what it answers', () =>
    Effect.gen(function* () {
      const { host, calls } = makeHost();
      const control = HostProcessControl.make(host);

      const snapshot = yield* control.spawn({
        spaceId,
        key: 'org.dxos.edge.process.coding-agent',
        name: 'Claude Code',
        idempotencyKey: 'claude-code-edge:chat',
      });
      expect(snapshot.pid).toBe(pid);
      expect(calls[0]).toEqual({
        method: 'spawn',
        args: [{ name: 'Claude Code', idempotencyKey: 'claude-code-edge:chat' }],
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
      const control = HostProcessControl.make(host);
      const client = yield* control.makeRpcClient({ spaceId, pid, group: Echo });
      expect(yield* client.echo({ text: 'lend' })).toEqual({ echoed: 'LEND' });
    }).pipe(Effect.scoped),
  );

  it.effect('dies on an answer that is not a process', () =>
    Effect.gen(function* () {
      const control = HostProcessControl.make({ spawn: () => Effect.succeed({ nope: true }) });
      const exit = yield* control.spawn({ spaceId, key: 'k' }).pipe(Effect.exit);
      expect(exit._tag).toBe('Failure');
    }),
  );
});
