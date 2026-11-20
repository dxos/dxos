//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';
import type * as Rpc from 'effect/rpc/Rpc';
import * as RpcClient from 'effect/rpc/RpcClient';
import type * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

import { RemoteProcessManager } from '@dxos/compute-runtime';
import type * as Process from '@dxos/compute/Process';
import { SerializedError } from '@dxos/protocols';

import { decodeEvent, decodeSnapshot } from './process-snapshot.ts';

/** The key EDGE serves process control under to an operation running in a plugin bundle. */
export const PROCESS_MANAGER_HOST_KEY = '@dxos/compute/Process.ManagerService';

/**
 * The process routes as EDGE serves them to an operation running in a plugin bundle (the
 * {@link PROCESS_MANAGER_HOST_KEY} host service), instead of over HTTP with a signed identity: an
 * operation has no identity of its own, so EDGE binds every call to the invocation's space (whatever
 * `spaceId` a request names) and checks every pid against it.
 */
export type Control = RemoteProcessManager.Control;

/** A host service as the plugin host hands it over: every method takes and returns plain data. */
export type Host = Readonly<Record<string, (...args: readonly unknown[]) => Effect.Effect<unknown, Error>>>;

const ProcessInfo = Schema.Struct({
  pid: Schema.String,
  parentPid: Schema.NullOr(Schema.String),
  key: Schema.String,
  params: Schema.Struct({
    name: Schema.NullOr(Schema.String),
    annotations: Schema.Record(Schema.String, Schema.Unknown),
  }),
  environment: Schema.Struct({ space: Schema.optional(Schema.String), conversation: Schema.optional(Schema.String) }),
  state: Schema.Literals([
    'STARTING',
    'RUNNING',
    'HYBERNATING',
    'IDLE',
    'TERMINATING',
    'TERMINATED',
    'SUCCEEDED',
    'FAILED',
  ]),
  alarmDueAt: Schema.NullOr(Schema.Number),
  error: Schema.NullOr(SerializedError),
  startedAt: Schema.Number,
  completedAt: Schema.optional(Schema.Number),
  metrics: Schema.Struct({ wallTime: Schema.Number, inputCount: Schema.Number, outputCount: Schema.Number }),
});

const ProcessEvent = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('output'), seq: Schema.Number, data: Schema.Unknown }),
  Schema.Struct({ _tag: Schema.Literal('trace'), seq: Schema.Number, message: Schema.Unknown }),
  Schema.Struct({
    _tag: Schema.Literal('exited'),
    seq: Schema.Number,
    outcome: Schema.Literals(['succeeded', 'failed', 'terminated']),
    error: Schema.optional(SerializedError),
  }),
]);

const EventsPage = Schema.Struct({
  events: Schema.Array(ProcessEvent),
  cursor: Schema.Number,
  truncated: Schema.Boolean,
  info: ProcessInfo,
});

const RpcResponse = Schema.Struct({
  status: Schema.Number,
  contentType: Schema.optional(Schema.String),
  body: Schema.String,
});

/** A host method's answer, decoded; like the HTTP control, any failure is a defect (the interface has no error channel). */
const callHost = <A>(host: Host, method: string, schema: Schema.Codec<A>, ...args: readonly unknown[]) =>
  Effect.suspend(() => {
    const fn = host[method];
    return fn === undefined
      ? Effect.die(new Error(`The host serves no ${method}.`))
      : fn(...args).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)), Effect.orDie);
  });

/** The process routes over a host service; see {@link Control}. */
export const make = (host: Host): Control => ({
  spawn: ({ key, name, annotations, idempotencyKey }) =>
    callHost(host, 'spawn', ProcessInfo, {
      key,
      ...(name !== undefined ? { name } : {}),
      ...(annotations !== undefined ? { annotations } : {}),
      ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    }).pipe(Effect.map(decodeSnapshot)),

  list: ({ key, state, target }) =>
    target !== undefined
      ? Effect.die(new Error('The host lists processes by key only, not by target.'))
      : callHost(host, 'list', Schema.Array(ProcessInfo), key !== undefined ? { key } : {}).pipe(
          Effect.map((infos) =>
            infos.map(decodeSnapshot).filter((info) => state === undefined || info.state === state),
          ),
        ),

  status: ({ pid }) => callHost(host, 'status', ProcessInfo, pid).pipe(Effect.map(decodeSnapshot)),

  terminate: ({ pid, idempotencyKey }) =>
    callHost(host, 'terminate', Schema.Unknown, pid, idempotencyKey ?? null).pipe(Effect.asVoid),

  submitInput: ({ pid, input, idempotencyKey }) =>
    callHost(host, 'submitInput', ProcessInfo, pid, input, idempotencyKey ?? null).pipe(Effect.asVoid),

  readEvents: ({ pid, cursor }) =>
    callHost(host, 'readEvents', EventsPage, pid, cursor).pipe(
      Effect.map((page): RemoteProcessManager.EventPage => ({
        events: page.events.map(decodeEvent),
        cursor: page.cursor,
        truncated: page.truncated,
        snapshot: decodeSnapshot(page.info),
      })),
    ),

  makeRpcClient: <Rpcs extends Rpc.Any>({
    pid,
    group,
  }: RemoteProcessManager.ProcessTarget & { readonly group: RpcGroup.RpcGroup<Rpcs> }): Effect.Effect<
    RpcClient.RpcClient<Rpcs>,
    never,
    Scope.Scope
  > =>
    Effect.gen(function* () {
      // The process serves its group as effect-rpc-over-HTTP; here each request body crosses the host
      // service instead of the network, and the answer is rebuilt as the response the protocol reads.
      const httpClient = HttpClient.make(
        (request) =>
          Effect.gen(function* () {
            const body = request.body._tag === 'Uint8Array' ? new TextDecoder().decode(request.body.body) : '';
            const contentType = request.headers['content-type'];
            const response = yield* callHost(host, 'rpc', RpcResponse, pid, body, contentType ?? null);
            return HttpClientResponse.fromWeb(
              request,
              new Response(response.body, {
                status: response.status,
                headers: response.contentType === undefined ? {} : { 'content-type': response.contentType },
              }),
            );
          }),
        // The protocol requires a URL; nothing fetches this one, since the body crosses the host service.
      ).pipe(HttpClient.mapRequest(HttpClientRequest.setUrl(`https://process.internal/${pid}/rpc`)));
      return yield* RpcClient.make(group).pipe(
        Effect.provideServiceEffect(RpcClient.Protocol, RpcClient.makeProtocolHttp(httpClient)),
      );
    }).pipe(Effect.provide(RpcSerialization.layerNdjson)),
});

/**
 * A {@link RemoteProcessManager.Manager} over the host service, which a plugin host provides to every bundle as
 * {@link RemoteProcessManager.Service}: the same view of EDGE's processes a client gets over HTTP.
 */
export const makeManager = (host: Host, registry: Registry.AtomRegistry): RemoteProcessManager.Manager => {
  const control = make(host);
  const processTreeAtom = Atom.make<readonly Process.Process[]>([]);
  registry.mount(processTreeAtom);
  return {
    processTree: Effect.sync(() => registry.get(processTreeAtom)),
    processTreeAtom,
    control,
    ...RemoteProcessManager.makeControlVerbs(control, registry, processTreeAtom),
  };
};
