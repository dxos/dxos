//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import type * as EffectRpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcSchema from 'effect/unstable/rpc/RpcSchema';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import * as RpcTest from 'effect/unstable/rpc/RpcTest';

import { Stream as PbStream } from '@dxos/async';
import { type RequestOptions } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { runServiceCall } from '@dxos/protocols';
import {
  ContactsService,
  DataService,
  DevicesService,
  DevtoolsHost,
  EdgeAgentService,
  FeedService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  QueryService,
  SpacesService,
  SystemService,
  WorkerService,
} from '@dxos/protocols/rpc';
import { type RpcPort, layerProtocolRpcPortClient, layerProtocolRpcPortServer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { DEFAULT_CLIENT_CHANNEL } from './config';
import * as Rpc from './Rpc';
import { type ClientServices } from './service';

export type MessagePortLike = MessagePort;

/**
 * Transport a {@link ClientServicesRpc} can run over: the native Worker-platform {@link MessagePort}
 * (shared-worker app port) or a byte {@link RpcPort} for legacy protobuf bridges (iframe shell,
 * devtools extension).
 */
export type ClientServicesTransport = MessagePortLike | RpcPort;

/**
 * All client service RPCs served over a single connection.
 * Rpc tags are prefixed with the {@link ClientServices} key (e.g. `DataService.subscribe`).
 *
 * {@link WorkerService} (the tab→worker control channel: `start`/`stop`) is merged in here rather
 * than served over a second port: it runs in the same tab→worker direction as the service RPCs, so
 * it multiplexes over the same app {@link MessagePort}. Only the reverse-direction `BridgeService`
 * (worker→tab) needs its own port.
 */
export class ClientServicesRpcs extends RpcGroup.make().merge(
  SystemService.Rpcs,
  NetworkService.Rpcs,
  LoggingService.Rpcs,
  IdentityService.Rpcs,
  InvitationsService.Rpcs,
  DevicesService.Rpcs,
  SpacesService.Rpcs,
  DataService.Rpcs,
  QueryService.Rpcs,
  FeedService.Rpcs,
  ContactsService.Rpcs,
  EdgeAgentService.Rpcs,
  DevtoolsHost.Rpcs,
  WorkerService.Rpcs,
) {}

type ClientServicesRpcUnion = RpcGroup.Rpcs<typeof ClientServicesRpcs>;

/**
 * Host-side service implementations, one per client service, each in the effect-rpc `Handlers`
 * shape (Effect/Stream-returning, tag-keyed). This is the shape service hosts provide and
 * {@link ClientRpcServer} serves directly, with no protobuf encode/decode at the boundary.
 */
export type ClientServicesHandlers = {
  SystemService: SystemService.Handlers;
  NetworkService: NetworkService.Handlers;
  LoggingService: LoggingService.Handlers;
  IdentityService: IdentityService.Handlers;
  InvitationsService: InvitationsService.Handlers;
  DevicesService: DevicesService.Handlers;
  SpacesService: SpacesService.Handlers;
  DataService: DataService.Handlers;
  QueryService: QueryService.Handlers;
  FeedService: FeedService.Handlers;
  ContactsService: ContactsService.Handlers;
  EdgeAgentService: EdgeAgentService.Handlers;
  DevtoolsHost: DevtoolsHost.Handlers;
  // Provided per-session by the worker session (drives readiness/origin/lock), not by the host.
  WorkerService: WorkerService.Handlers;
};

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

const isVoidSchema = (schema: { ast: { _tag: string } }): boolean => schema.ast._tag === 'Void';

/** Splits an rpc tag into the {@link ClientServices} key and the service method name. */
const parseTag = (tag: string): [serviceKey: keyof ClientServices, methodName: string] => {
  const index = tag.indexOf('.');
  return [tag.slice(0, index) as keyof ClientServices, tag.slice(index + 1)];
};

/** Resolves a bound service method from a services provider, throwing if the service/method is absent. */
const resolveServiceMethod = (
  services: Partial<ClientServices>,
  serviceKey: keyof ClientServices,
  methodName: string,
  tag: string,
): ((request: unknown) => unknown) => {
  const service = services[serviceKey] as Record<string, unknown> | undefined;
  if (!service) {
    throw new Error(`Service not available: ${serviceKey}`);
  }
  const method = service[methodName];
  if (typeof method !== 'function') {
    throw new Error(`Method not available: ${tag}`);
  }
  return (method as (request: unknown) => unknown).bind(service);
};

//
// Server.
//

export type ClientRpcServerParams = {
  /**
   * Native Worker-platform transport. Provide this or {@link protocol}.
   */
  port?: MessagePortLike;
  /**
   * Pre-built server protocol (the value the {@link RpcServer.Protocol} tag resolves to — e.g. handed
   * to a worker-framework session via effect context). Provide this or {@link port}.
   */
  protocol?: RpcServer.Protocol['Service'];
  /**
   * Resolved per call so the served set follows the host lifecycle (services host open/close).
   */
  services: () => Partial<ClientServicesHandlers>;
  /**
   * Awaited before dispatching each request (e.g. worker readiness); a rejection fails the call.
   */
  onRequest?: () => Promise<void>;
};

/**
 * Serves {@link ClientServices} implementations over a {@link MessagePort} via effect-rpc.
 */
export class ClientRpcServer {
  readonly #params: ClientRpcServerParams;
  #server?: ReturnType<typeof Rpc.serve>;

  constructor(params: ClientRpcServerParams) {
    this.#params = params;
  }

  async open(): Promise<void> {
    if (this.#server) {
      return;
    }

    const handlers = makeClientServicesHandlers(this.#params);
    // `timing` publishes dxos.rpc.queueWait/service.duration. Queue wait is the only signal that
    // shows the worker being saturated rather than slow, and it is measurable only from the client
    // side of the port. Both ends must agree: the middleware is `requiredForClient`, so a server
    // that applies it while the client does not would reject every request — see
    // `makeClientServicesRpc` below.
    const options = { disableTracing: true, concurrency: 'unbounded', timing: true } as const;
    if (this.#params.protocol) {
      this.#server = Rpc.serveOverProtocol(
        Layer.succeed(RpcServer.Protocol, this.#params.protocol),
        ClientServicesRpcs,
        handlers,
        options,
      );
    } else {
      invariant(this.#params.port, 'ClientRpcServer requires a port or a protocol.');
      this.#server = Rpc.serve(this.#params.port, ClientServicesRpcs, handlers, options);
    }
    await this.#server.open();
  }

  async close(): Promise<void> {
    const server = this.#server;
    this.#server = undefined;
    await server?.close();
  }
}

export type ServeClientServicesOverIFrameOptions = {
  iframe: HTMLIFrameElement;
  origin: string;
  channel?: string;
  services: () => Partial<ClientServicesHandlers>;
};

/**
 * Serves {@link ClientServices} to a child iframe (e.g. the shell) over the effect-rpc byte protocol
 * and opens the connection. The iframe uses a byte {@link RpcPort} transport (not a `MessagePort`),
 * matching the shell's {@link ClientServicesProxy} consumer, so this serves over
 * {@link layerProtocolRpcPortServer} rather than the Worker-runner protocol used by
 * {@link ClientRpcServer}. Kept here — alongside the rpc definitions — so the `RpcPort` binding is
 * resolved in this package's type universe rather than in `@dxos/client`, whose merged-with-`main`
 * build resolves `ClientRpcServer.port` as a `MessagePort`.
 */
export const serveClientServicesOverIFrame = async ({
  iframe,
  origin,
  channel = DEFAULT_CLIENT_CHANNEL,
  services,
}: ServeClientServicesOverIFrameOptions): Promise<Rpc.GroupServer> => {
  const server = Rpc.serveOverProtocol(
    layerProtocolRpcPortServer(createIFramePort({ channel, iframe, origin })),
    ClientServicesRpcs,
    makeClientServicesHandlers({ services }),
    { disableTracing: true, concurrency: 'unbounded' },
  );
  await server.open();
  return server;
};

/**
 * Builds handler layers for every client service RPC, dispatching to the service implementations
 * resolved from `services` on each call.
 */
export const makeClientServicesHandlers = ({
  services,
  onRequest,
}: Pick<ClientRpcServerParams, 'services' | 'onRequest'>): Layer.Layer<EffectRpc.ToHandler<ClientServicesRpcUnion>> => {
  const gate = onRequest ? Effect.tryPromise({ try: onRequest, catch: toError }) : Effect.void;

  const handlers: Record<string, (payload: unknown) => unknown> = {};
  for (const [tag, rpc] of ClientServicesRpcs.requests) {
    const [serviceKey] = parseTag(tag);
    // The host service is itself in the Handlers shape, keyed by the full prefixed tag; invoking it
    // returns the Effect/Stream directly, so no protobuf encode/decode adapter is needed.
    // A missing handler is a TYPED failure, never a throw: the worker-pool client reads a defect as
    // the shared connection crashing and fails every unrelated in-flight call with it.
    const resolve = (): ((payload: unknown) => unknown) | Error => {
      const service = services()[serviceKey] as Record<string, (payload: unknown) => unknown> | undefined;
      const handler = service?.[tag];
      if (typeof handler !== 'function') {
        return new Error(`Service handler not available: ${tag}`);
      }
      return handler.bind(service);
    };

    if (RpcSchema.isStreamSchema(rpc.successSchema)) {
      handlers[tag] = (payload: unknown) =>
        gate.pipe(
          Effect.flatMap(() => {
            const handler = resolve();
            return handler instanceof Error
              ? Effect.fail(handler)
              : Effect.succeed(handler(payload) as Stream.Stream<unknown, unknown>);
          }),
          Stream.unwrap,
        );
    } else {
      handlers[tag] = (payload: unknown) =>
        gate.pipe(
          Effect.flatMap(() => {
            const handler = resolve();
            return handler instanceof Error
              ? Effect.fail(handler)
              : (handler(payload) as Effect.Effect<unknown, unknown>);
          }),
        );
    }
  }

  // Handlers are dispatched dynamically across all merged service groups, so their per-method types
  // cannot be expressed statically.
  return ClientServicesRpcs.toLayer(handlers as never);
};

//
// Client.
//

/**
 * Effect-native client for all client services, inferred from the effect-rpc definitions.
 * Keyed by the full rpc tag (e.g. `rpc['DataService.subscribe'](req)` returns a `Stream`, unary
 * methods return an `Effect`). Each service's `Client` type already carries its own prefixed tags,
 * so this is their intersection — cheaper for the type-checker than re-expanding the full merged
 * {@link RpcClient.RpcClient} mapped type over all services.
 */
export interface ClientServicesRpc
  extends
    SystemService.Client,
    NetworkService.Client,
    LoggingService.Client,
    IdentityService.Client,
    InvitationsService.Client,
    DevicesService.Client,
    SpacesService.Client,
    DataService.Client,
    QueryService.Client,
    FeedService.Client,
    ContactsService.Client,
    EdgeAgentService.Client,
    DevtoolsHost.Client,
    WorkerService.Client {}

/**
 * Builds the effect-native {@link ClientServicesRpc} over a {@link MessagePort}.
 * The returned scope owns the connection; closing it releases the transport.
 */
export const makeClientServicesRpc = (
  port: ClientServicesTransport,
): Effect.Effect<ClientServicesRpc, never, Scope.Scope> =>
  // An RpcPort (byte transport) carries the legacy iframe/devtools bridges; a MessagePort uses the
  // native Worker-platform protocol.
  ('send' in port
    ? Rpc.makeClientOverProtocol(layerProtocolRpcPortClient(port), ClientServicesRpcs, {
        disableTracing: true,
        timing: true,
      })
    : Rpc.makeClient(port, ClientServicesRpcs, { disableTracing: true, timing: true })
  ).pipe(Effect.map((client) => client as ClientServicesRpc));

/**
 * Builds an in-process {@link ClientServicesRpc} backed directly by host {@link ClientServicesHandlers}
 * (no wire hop or serialization). Used by host-internal consumers (diagnostics, devtools) that need
 * the client surface without a transport.
 */
export const makeInProcessClientServicesRpc = (
  services: () => Partial<ClientServicesHandlers>,
): Effect.Effect<ClientServicesRpc, never, Scope.Scope> =>
  RpcTest.makeClient(ClientServicesRpcs).pipe(
    Effect.provide(makeClientServicesHandlers({ services })),
  ) as unknown as Effect.Effect<ClientServicesRpc, never, Scope.Scope>;

/**
 * Derives host {@link ClientServicesHandlers} from an effect-native {@link ClientServicesRpc}, so a
 * client-side rpc surface can be re-served (e.g. the devtools bridge). Each handler delegates to the
 * corresponding client method.
 */
export const makeHandlersFromRpc = (rpc: ClientServicesRpc): Partial<ClientServicesHandlers> => {
  // The rpc client is a flat record keyed by the prefixed tag (`InvitationsService.queryInvitations`),
  // not a per-service object; the handler shape it is being reshaped into *is* nested by service.
  const rpcRecord = rpc as unknown as Record<string, (...args: any[]) => unknown>;
  const handlers: Partial<Record<keyof ClientServices, Record<string, unknown>>> = {};
  for (const [tag] of ClientServicesRpcs.requests) {
    const [serviceKey] = parseTag(tag);
    const service = (handlers[serviceKey] ??= {});
    service[tag] = (payload: unknown) => rpcRecord[tag](payload);
  }
  return handlers as Partial<ClientServicesHandlers>;
};

/**
 * Derives the Promise/{@link PbStream} shaped {@link ClientServices} from an effect-native
 * {@link ClientServicesRpc}. Retained for consumers not yet migrated to the effect surface.
 */
export const makeServicesFromRpc = (
  rpc: ClientServicesRpc,
  runtime: Context.Context<never>,
): Partial<ClientServices> => {
  // The rpc client is a flat record keyed by the prefixed tag; methods are addressed dynamically
  // from the rpc groups, so the per-method types cannot be expressed statically.
  const rpcRecord = rpc as unknown as Record<string, (...args: any[]) => unknown>;
  const services: Partial<Record<keyof ClientServices, Record<string, unknown>>> = {};
  for (const [tag, rpcDef] of ClientServicesRpcs.requests) {
    const [serviceKey, methodName] = parseTag(tag);
    const service = (services[serviceKey] ??= {});
    const hasPayload = !isVoidSchema(rpcDef.payloadSchema);
    const invoke = (request?: unknown) => rpcRecord[tag](hasPayload ? (request ?? {}) : undefined);

    if (RpcSchema.isStreamSchema(rpcDef.successSchema)) {
      service[methodName] = (request?: unknown) =>
        streamToPbStream(runtime, invoke(request) as Stream.Stream<unknown, unknown>, tag);
    } else {
      service[methodName] = (request?: unknown, options?: RequestOptions) =>
        runServiceCall(runtime, invoke(request) as Effect.Effect<unknown, unknown, never>, {
          timeout: options?.timeout,
          label: tag,
        });
    }
  }
  return services as Partial<ClientServices>;
};

/**
 * Builds an effect-native {@link ClientServicesRpc} from Promise/{@link PbStream} shaped
 * {@link ClientServices} implementations, without a wire hop. Used by in-process providers
 * (e.g. `LocalClientServices`) so their consumers use the same effect surface as remote proxies.
 */
export const makeRpcFromServices = (services: () => Partial<ClientServices>): ClientServicesRpc => {
  const rpc: Record<string, Record<string, (...args: any[]) => unknown>> = {};
  for (const [tag, rpcDef] of ClientServicesRpcs.requests) {
    const [serviceKey, methodName] = parseTag(tag);
    const service = (rpc[serviceKey] ??= {});
    const resolveMethod = () => resolveServiceMethod(services(), serviceKey, methodName, tag);

    if (RpcSchema.isStreamSchema(rpcDef.successSchema)) {
      service[methodName] = (request?: unknown) =>
        pbStreamToStream(() => resolveMethod()(request) as PbStream<unknown>);
    } else {
      service[methodName] = (request?: unknown) =>
        Effect.tryPromise({ try: async () => resolveMethod()(request), catch: toError });
    }
  }
  return rpc as unknown as ClientServicesRpc;
};

//
// Stream adapters.
//

/**
 * Adapts a protobuf service stream to an effect stream.
 * Unbounded buffering matches the push semantics of the source stream.
 */
export const pbStreamToStream = <T>(open: () => PbStream<T>): Stream.Stream<T, Error> =>
  EffectEx.streamFromEmitter<T, Error>((emit) => {
    let source: PbStream<T>;
    try {
      source = open();
    } catch (err) {
      emit.fail(toError(err));
      return;
    }
    source.subscribe(
      (data) => void emit.single(data),
      (err) => void (err ? emit.fail(toError(err)) : emit.end()),
    );
    return Effect.promise(async () => source.close());
  });

/**
 * Adapts an effect stream to a protobuf service stream.
 * Consumer close interrupts the underlying rpc subscription.
 */
export const streamToPbStream = <T>(
  runtime: Context.Context<never>,
  stream: Stream.Stream<T, unknown>,
  label?: string,
): PbStream<T> =>
  new PbStream<T>(({ ready, next, close }) => {
    const fiber = stream.pipe(
      Stream.onStart(Effect.sync(ready)),
      Stream.runForEach((item) => Effect.sync(() => next(item))),
      Effect.matchCauseEffect({
        onFailure: (cause) =>
          Effect.sync(() => {
            const error = toError(Cause.squash(cause));
            if (Cause.hasInterruptsOnly(cause)) {
              close();
              return;
            }
            // A `PbStream` consumer may pass no error handler, in which case the failure is dropped
            // and the consumer waits forever — a silently unencodable response field once made the
            // app unbootable this way. Logged here so every client service stream is diagnosable.
            log.warn('client service stream failed', { label, error: String(error) });
            close(error);
          }),
        onSuccess: () => Effect.sync(() => close()),
      }),
      Effect.runForkWith(runtime),
    );

    return () => {
      fiber.interruptUnsafe();
    };
  });
