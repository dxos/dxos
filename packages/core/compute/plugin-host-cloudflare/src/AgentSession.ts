//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import type * as Rpc from 'effect/rpc/Rpc';
import * as RpcClient from 'effect/rpc/RpcClient';
import type * as RpcGroup from 'effect/rpc/RpcGroup';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { ProcessNotFoundError, type RemoteProcessManager } from '@dxos/compute-runtime';
import { handOffWorkingSet } from '@dxos/compute-runtime/protocol';
import { ProcessProtocolCodec, RemoteProcessHandle } from '@dxos/compute-runtime/remote-process';
import * as Agent from '@dxos/compute/Agent';
import type * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Annotation, Database, Feed, Obj, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { type SpaceId, URI } from '@dxos/keys';
import { ErrorCodec, type PluginProtocol } from '@dxos/protocols';
import { ContentBlock } from '@dxos/types';

//
// The bundle's `Agent.Service`: every verb is served by the EDGE process that hosts the invocation's session
// (`PluginProtocol.AgentSession`), and the bundle only encodes the verb and resolves what it answers in its own space
// database (EDGE spec `org.dxos.edge.agent-service-bridge`).
//

export class AgentSessionError extends BaseError.extend('AgentSessionError', 'The agent session failed') {}

const encodeBlock = Schema.encodeUnknownEffect(Schema.toCodecJson(ContentBlock.Any));
const decodeThread = Schema.decodeUnknownSync(Trajectory.ThreadId);

/**
 * The `Agent.Service` an operation in a plugin bundle gets for the session EDGE names. URIs it receives resolve in the
 * invocation's space database, which `database` provides.
 */
export const make = ({
  session,
  spaceId,
  database,
  refreshWorkingSet,
}: {
  session: PluginProtocol.AgentSession;
  spaceId: SpaceId;
  database: Context.Context<Database.Service>;
  /** Brings the invocation's documents up to date with what the session's host wrote (as after a nested call). */
  refreshWorkingSet?: () => Promise<void>;
}): Agent.ServiceApi => {
  const registry = Registry.make();
  const control = makeControl(session);
  const { db } = Context.get(database, Database.Service);

  /** Runs a verb on the session target; a failure keeps `NoCurrentSessionError`'s type and dies otherwise. */
  const call = <Verb extends PluginProtocol.AgentVerb>(
    verb: Verb,
    args: PluginProtocol.AgentVerbs[Verb]['args'],
  ): Effect.Effect<PluginProtocol.AgentVerbs[Verb]['result'], Agent.NoCurrentSessionError> =>
    Effect.tryPromise({
      // The host reads what this invocation wrote (a task it delegates) and writes what it reads next (the session it
      // delegates to), so each verb hands the working set over as a nested call does.
      try: () => handOffWorkingSet(db, refreshWorkingSet, () => session.call(verb, args)),
      catch: (cause) => new AgentSessionError({ cause, context: { verb } }),
    }).pipe(
      Effect.orDie,
      Effect.flatMap((result) => (result.ok ? Effect.succeed(result.value) : Effect.fail(toError(result.error)))),
      Effect.catchIf(
        (error): error is AgentSessionError => !(error instanceof Agent.NoCurrentSessionError),
        Effect.die,
      ),
    );

  /** {@link call} for a verb that cannot fail on the session's own terms. */
  const run = <Verb extends PluginProtocol.AgentVerb>(verb: Verb, args: PluginProtocol.AgentVerbs[Verb]['args']) =>
    call(verb, args).pipe(Effect.orDie);

  const resolve = <S extends Parameters<typeof Database.resolve>[1]>(uri: string, schema: S) =>
    Database.resolve(URI.make(uri), schema).pipe(Effect.provide(database));

  const sessionUri = (target: Agent.Session): string => Obj.getURI(target);

  /** Content blocks in their JSON form, one by one: the wire carries an array of them. */
  const content = (blocks: readonly ContentBlock.Any[]) =>
    Effect.forEach(blocks, (block) => encodeBlock(block)).pipe(Effect.orDie);

  return {
    open: (target, options) =>
      run('open', [
        sessionUri(target),
        {
          ...(options?.provider !== undefined ? { provider: String(options.provider) } : {}),
          ...(options?.systemPrompt !== undefined ? { systemPrompt: options.systemPrompt } : {}),
          ...(options?.location !== undefined ? { location: options.location } : {}),
        },
      ]),

    // The session's processes are EDGE's: there is nothing a bundle hydrates.
    hydrate: () => Effect.void,

    getContext: (target) =>
      run('getContext', [sessionUri(target)]).pipe(Effect.map((uris) => uris.map((uri) => Ref.fromURI(URI.make(uri))))),

    addContext: (target, context) =>
      run('addContext', [sessionUri(target), context.map((ref) => String(ref.uri))]).pipe(Effect.asVoid),

    submitPrompt: Effect.fnUntraced(function* (target, prompt, options) {
      const encoded = typeof prompt === 'string' ? prompt : yield* content(prompt);
      yield* run('submitPrompt', [
        sessionUri(target),
        encoded,
        {
          ...(options?.sender !== undefined ? { sender: options.sender } : {}),
          ...(options?.thread !== undefined ? { thread: options.thread } : {}),
        },
      ]);
    }),

    // A snapshot: a live atom would hold an RPC open past the invocation, which pins it (DX-1138).
    running: (target) => run('running', [sessionUri(target)]).pipe(Effect.map((running) => Atom.make(running))),

    waitForCompletion: (target) => run('waitForCompletion', [sessionUri(target)]).pipe(Effect.asVoid),

    terminate: (target) => run('terminate', [sessionUri(target)]).pipe(Effect.asVoid),

    // Read through the session's own process handle, as a client reads an EDGE session's trace.
    subscribeEphemeral: (target, options) =>
      Stream.unwrap(
        run('sessionProcess', [sessionUri(target)]).pipe(
          Effect.map((info) =>
            info === null
              ? Stream.empty
              : RemoteProcessHandle.RemoteProcessHandle.makeSync({
                  info: ProcessProtocolCodec.decodeSnapshot(info),
                  control,
                  spaceId,
                  registry,
                }).subscribeEphemeral(options),
          ),
        ),
      ),

    currentSession: call('currentSession', []).pipe(
      Effect.flatMap((uri) =>
        resolve(uri, Agent.Session).pipe(Effect.mapError(() => new Agent.NoCurrentSessionError())),
      ),
    ),

    currentFeed: call('currentFeed', []).pipe(
      Effect.flatMap((uri) => resolve(uri, Feed.Feed).pipe(Effect.mapError(() => new Agent.NoCurrentSessionError()))),
    ),

    currentAgent: run('currentAgent', []).pipe(
      Effect.flatMap((uri) =>
        uri === null ? Effect.succeed(Option.none()) : resolve(uri, Agent.Agent).pipe(Effect.option),
      ),
    ),

    currentThread: run('currentThread', []).pipe(
      Effect.map((thread) => (thread === null ? Option.none() : Option.some(decodeThread(thread)))),
    ),

    enqueueMessage: ({ content: blocks }) =>
      content(blocks).pipe(
        Effect.flatMap((encoded) => call('enqueueMessage', [encoded])),
        Effect.asVoid,
      ),

    setAlarm: ({ at, message }) =>
      call('setAlarm', [DateTime.formatIso(DateTime.toUtc(at)), message]).pipe(Effect.asVoid),

    listSessions: (options) =>
      run('listSessions', [options?.agent !== undefined ? { agent: String(options.agent) } : {}]).pipe(
        Effect.map((uris) => uris.map((uri) => URI.make(uri))),
      ),

    listAgents: () => run('listAgents', []).pipe(Effect.map((uris) => uris.map((uri) => URI.make(uri)))),

    spawn: <I, O, Rpcs extends Rpc.Any = never>(
      definition: Operation.Durable<I, O, any, Rpcs>,
      options?: Agent.SpawnOptions,
    ): Effect.Effect<Process.Process<I, O, Rpcs>> =>
      run('spawn', [
        ProcessProtocolCodec.toSpawnRequest({
          key: definition.key,
          ...(options?.name !== undefined ? { name: options.name } : {}),
          ...(options?.parentProcessId !== undefined ? { parentPid: options.parentProcessId } : {}),
          ...(options?.environment !== undefined ? { environment: options.environment } : {}),
          annotations: spawnAnnotations(options),
        }),
        {
          ...(options?.session !== undefined ? { session: String(options.session) } : {}),
          ...(options?.thread !== undefined ? { thread: options.thread } : {}),
        },
      ]).pipe(
        Effect.map((info) =>
          RemoteProcessHandle.RemoteProcessHandle.makeSync({
            info: ProcessProtocolCodec.decodeSnapshot(info),
            control,
            spaceId,
            definition,
            registry,
          }),
        ),
      ),

    delegate: Effect.fnUntraced(function* ({ target, message, task, purpose }) {
      const encoded = message === undefined ? undefined : yield* content(message);
      const result = yield* call('delegate', [
        {
          target:
            target.kind === 'thread'
              ? { kind: 'thread' }
              : target.kind === 'session'
                ? { kind: 'session', ...(target.session !== undefined ? { session: String(target.session) } : {}) }
                : { kind: 'agent', agent: String(target.agent) },
          ...(encoded !== undefined ? { message: encoded } : {}),
          ...(task !== undefined ? { task: String(task.uri) } : {}),
          ...(purpose !== undefined ? { purpose } : {}),
        },
      ]);
      return {
        ...(result.thread !== undefined ? { thread: decodeThread(result.thread) } : {}),
        ...(result.session !== undefined ? { session: URI.make(result.session) } : {}),
      };
    }),

    waitForThread: (thread) => call('waitForThread', [thread]),
  };
};

/**
 * The annotations a spawn stamps, folded as the local process manager folds them: `target` and `notify` are shorthand
 * for their annotations, and explicit annotations override both.
 */
const spawnAnnotations = (options: Agent.SpawnOptions | undefined): Annotation.Dictionary =>
  Annotation.buildDictionary((dictionary) => {
    if (options?.target != null) {
      Annotation.setDictionary(dictionary, Process.TargetAnnotation, options.target);
    }
    if (options?.notify != null) {
      Annotation.setDictionary(dictionary, Process.NotifyAnnotation, options.notify);
    }
    if (options?.annotations) {
      Object.assign(dictionary, options.annotations);
    }
  });

/** A failure the target reports: the session's own error by its name, anything else as EDGE raised it. */
const toError = (failure: PluginProtocol.Failure): Agent.NoCurrentSessionError | AgentSessionError =>
  failure.name === 'NoCurrentSessionError'
    ? new Agent.NoCurrentSessionError()
    : new AgentSessionError({
        message: failure.message,
        ...(failure.encoded !== undefined ? { cause: ErrorCodec.decode(failure.encoded) } : {}),
      });

/**
 * `RemoteProcessManager.Control` over the session target, for the handles of the processes a verb names. Spawning
 * and listing go through `Agent.spawn` and `Agent.listSessions`, which stamp the caller's session.
 */
const makeControl = (session: PluginProtocol.AgentSession): RemoteProcessManager.Control => {
  const process = <Op extends PluginProtocol.AgentProcessOp>(
    request: PluginProtocol.AgentProcessRequests[Op]['request'] & { readonly op: Op },
  ): Effect.Effect<PluginProtocol.AgentProcessRequests[Op]['result']> =>
    Effect.tryPromise({
      try: () => session.process(request),
      catch: (cause) => new AgentSessionError({ cause, context: { op: request.op } }),
    }).pipe(
      Effect.flatMap((result) =>
        result.ok
          ? Effect.succeed(result.value)
          : Effect.fail(
              result.error.name === 'ProcessNotFoundError'
                ? new ProcessNotFoundError({ message: result.error.message })
                : toError(result.error),
            ),
      ),
      Effect.orDie,
    );

  return {
    spawn: () => Effect.die(new Error('A bundle spawns through Agent.spawn.')),
    list: () => Effect.die(new Error('A bundle lists sessions through Agent.listSessions.')),
    status: ({ spaceId, pid }) =>
      process({ op: 'status', spaceId, pid }).pipe(Effect.map(ProcessProtocolCodec.decodeSnapshot)),
    submitInput: ({ spaceId, pid, input, idempotencyKey }) =>
      process({
        op: 'submitInput',
        spaceId,
        pid,
        input,
        ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
      }).pipe(Effect.asVoid),
    terminate: ({ spaceId, pid, idempotencyKey }) =>
      process({ op: 'terminate', spaceId, pid, ...(idempotencyKey !== undefined ? { idempotencyKey } : {}) }).pipe(
        Effect.asVoid,
      ),
    readEvents: ({ spaceId, pid, cursor }) =>
      process({ op: 'readEvents', spaceId, pid, cursor }).pipe(
        Effect.map((page): RemoteProcessManager.EventPage => ({
          events: page.events.map(ProcessProtocolCodec.decodeEvent),
          cursor: page.cursor,
          truncated: page.truncated,
          snapshot: ProcessProtocolCodec.decodeSnapshot(page.info),
        })),
      ),
    makeRpcClient: <Rpcs extends Rpc.Any>({
      spaceId,
      pid,
      group,
    }: RemoteProcessManager.ProcessTarget & { readonly group: RpcGroup.RpcGroup<Rpcs> }): Effect.Effect<
      RpcClient.RpcClient<Rpcs>,
      never,
      Scope.Scope
    > =>
      // The process serves its group as effect-rpc over HTTP; the target forwards each request to that endpoint, so
      // the URL only has to parse.
      Effect.gen(function* () {
        const httpClient = (yield* HttpClient.HttpClient).pipe(
          HttpClient.mapRequest(HttpClientRequest.setUrl(PROCESS_RPC_URL)),
        );
        return yield* RpcClient.make(group).pipe(
          Effect.provideServiceEffect(RpcClient.Protocol, RpcClient.makeProtocolHttp(httpClient)),
        );
      }).pipe(
        Effect.provide(RpcHttpLayer),
        Effect.provideService(FetchHttpClient.Fetch, (input, init) =>
          session.processRpc(spaceId, pid, new Request(input, init)),
        ),
        Effect.orDie,
      ),
  };
};

/** Where a process RPC request is addressed; the session target, not the URL, routes it. */
const PROCESS_RPC_URL = 'https://process.invalid/rpc';

/** The HTTP client and NDJSON serialization a process's RPC client runs on; each call provides the process's fetch. */
const RpcHttpLayer = Layer.provideMerge(FetchHttpClient.layer, RpcSerialization.layerNdjson);
