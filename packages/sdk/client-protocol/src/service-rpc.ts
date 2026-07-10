//
// Copyright 2026 DXOS.org
//

import type * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcSchema from '@effect/rpc/RpcSchema';
import * as RpcTest from '@effect/rpc/RpcTest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { type RequestOptions } from '@dxos/codec-protobuf';
import { Stream as PbStream } from '@dxos/codec-protobuf/stream';
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
} from '@dxos/protocols/rpc';
import { makeRpcClient, serveRpcGroup } from '@dxos/worker-framework';

import { type ClientServices } from './service';

export type MessagePortLike = MessagePort;

/**
 * All client service RPCs served over a single connection.
 * Rpc tags are prefixed with the {@link ClientServices} key (e.g. `DataService.subscribe`).
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
};

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

const isVoidSchema = (schema: { ast: { _tag: string } }): boolean => schema.ast._tag === 'VoidKeyword';

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
  port: MessagePortLike;
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
  #server?: ReturnType<typeof serveRpcGroup>;

  constructor(params: ClientRpcServerParams) {
    this.#params = params;
  }

  async open(): Promise<void> {
    if (this.#server) {
      return;
    }

    this.#server = serveRpcGroup(this.#params.port, ClientServicesRpcs, makeClientServicesHandlers(this.#params), {
      disableTracing: true,
      concurrency: 'unbounded',
    });
    await this.#server.open();
  }

  async close(): Promise<void> {
    const server = this.#server;
    this.#server = undefined;
    await server?.close();
  }
}

/**
 * Builds handler layers for every client service RPC, dispatching to the service implementations
 * resolved from `services` on each call.
 */
export const makeClientServicesHandlers = ({
  services,
  onRequest,
}: Pick<ClientRpcServerParams, 'services' | 'onRequest'>): Layer.Layer<Rpc.ToHandler<ClientServicesRpcUnion>> => {
  const gate = onRequest ? Effect.tryPromise({ try: onRequest, catch: toError }) : Effect.void;

  const handlers: Record<string, (payload: unknown) => unknown> = {};
  for (const [tag, rpc] of ClientServicesRpcs.requests) {
    const [serviceKey] = parseTag(tag);
    // The host service is itself in the Handlers shape, keyed by the full prefixed tag; invoking it
    // returns the Effect/Stream directly, so no protobuf encode/decode adapter is needed.
    const invoke = (payload: unknown) => {
      const service = services()[serviceKey] as Record<string, (payload: unknown) => unknown> | undefined;
      const handler = service?.[tag];
      if (typeof handler !== 'function') {
        throw new Error(`Service handler not available: ${tag}`);
      }
      return handler.call(service, payload);
    };

    if (RpcSchema.isStreamSchema(rpc.successSchema)) {
      handlers[tag] = (payload: unknown) =>
        gate.pipe(
          Effect.map(() => invoke(payload) as Stream.Stream<unknown, unknown>),
          Stream.unwrap,
        );
    } else {
      handlers[tag] = (payload: unknown) =>
        gate.pipe(Effect.flatMap(() => invoke(payload) as Effect.Effect<unknown, unknown>));
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
 * Nested by service key (e.g. `rpc.DataService.subscribe(req)` returns a `Stream`, unary methods
 * return an `Effect`). Each service's `Client` type already nests its methods under the service key
 * (the rpc tags are prefixed), so this is their intersection — cheaper for the type-checker than
 * re-expanding the full merged {@link RpcClient.RpcClient} mapped type over all services.
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
    DevtoolsHost.Client {}

/**
 * Builds the effect-native {@link ClientServicesRpc} over a {@link MessagePort}.
 * The returned scope owns the connection; closing it releases the transport.
 */
export const makeClientServicesRpc = (port: MessagePortLike): Effect.Effect<ClientServicesRpc, never, Scope.Scope> =>
  makeRpcClient(port, ClientServicesRpcs, { disableTracing: true }).pipe(
    Effect.map((client) => client as ClientServicesRpc),
  );

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
  const rpcRecord = rpc as unknown as Record<string, Record<string, (...args: any[]) => unknown>>;
  const handlers: Partial<Record<keyof ClientServices, Record<string, unknown>>> = {};
  for (const [tag] of ClientServicesRpcs.requests) {
    const [serviceKey, methodName] = parseTag(tag);
    const service = (handlers[serviceKey] ??= {});
    service[tag] = (payload: unknown) => rpcRecord[serviceKey][methodName](payload);
  }
  return handlers as Partial<ClientServicesHandlers>;
};

/**
 * Derives the Promise/{@link PbStream} shaped {@link ClientServices} from an effect-native
 * {@link ClientServicesRpc}. Retained for consumers not yet migrated to the effect surface.
 */
export const makeServicesFromRpc = (
  rpc: ClientServicesRpc,
  runtime: Runtime.Runtime<never>,
): Partial<ClientServices> => {
  // The rpc client is nested by service; methods are addressed dynamically from the rpc groups,
  // so the per-method types cannot be expressed statically.
  const rpcRecord = rpc as unknown as Record<string, Record<string, (...args: any[]) => unknown>>;
  const services: Partial<Record<keyof ClientServices, Record<string, unknown>>> = {};
  for (const [tag, rpcDef] of ClientServicesRpcs.requests) {
    const [serviceKey, methodName] = parseTag(tag);
    const service = (services[serviceKey] ??= {});
    const hasPayload = !isVoidSchema(rpcDef.payloadSchema);
    const invoke = (request?: unknown) => rpcRecord[serviceKey][methodName](hasPayload ? (request ?? {}) : undefined);

    if (RpcSchema.isStreamSchema(rpcDef.successSchema)) {
      service[methodName] = (request?: unknown) =>
        streamToPbStream(runtime, invoke(request) as Stream.Stream<unknown, unknown>);
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
const pbStreamToStream = <T>(open: () => PbStream<T>): Stream.Stream<T, Error> =>
  Stream.asyncScoped<T, Error>(
    (emit) =>
      Effect.acquireRelease(Effect.try({ try: open, catch: toError }), (stream) =>
        Effect.promise(async () => stream.close()),
      ).pipe(
        Effect.tap((stream) =>
          Effect.sync(() => {
            stream.subscribe(
              (data) => void emit.single(data),
              (err) => void (err ? emit.fail(toError(err)) : emit.end()),
            );
          }),
        ),
      ),
    'unbounded',
  );

/**
 * Adapts an effect stream to a protobuf service stream.
 * Consumer close interrupts the underlying rpc subscription.
 */
const streamToPbStream = <T>(runtime: Runtime.Runtime<never>, stream: Stream.Stream<T, unknown>): PbStream<T> =>
  new PbStream<T>(({ ready, next, close }) => {
    const fiber = stream.pipe(
      Stream.onStart(Effect.sync(ready)),
      Stream.runForEach((item) => Effect.sync(() => next(item))),
      Effect.matchCauseEffect({
        onFailure: (cause) =>
          Effect.sync(() => close(Cause.isInterruptedOnly(cause) ? undefined : toError(Cause.squash(cause)))),
        onSuccess: () => Effect.sync(() => close()),
      }),
      Runtime.runFork(runtime),
    );

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id());
    };
  });
