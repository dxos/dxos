//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcMessage from 'effect/unstable/rpc/RpcMessage';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ServerOptions = NonNullable<Parameters<typeof RpcServer.make>[1]>;

/** An in-process rpc client surface: handlers keyed by their full (prefixed) rpc tag. */
export type Client = Record<string, (...args: any[]) => unknown>;

export type ServeOptions<ClientRpcs extends Rpc.Any = Rpc.Any> = ServerOptions & {
  /**
   * The group's in-process client, exposed through {@link Service.client} for consumers that call
   * the handlers directly (no transport, no codec). Typed by its own rpcs rather than the served
   * group's, because the caller supplies it for the group as defined while the transport serves
   * that group under middleware.
   */
  readonly inProcessClient?: Effect.Effect<RpcClient.RpcClient<ClientRpcs>, never, Scope.Scope>;
};

/**
 * A registry of rpc groups that any number of transports serve. Each provider registers its own
 * group with {@link Service.serve}, so no single place enumerates the services a transport carries;
 * {@link Service.attach} then serves everything registered — before or after — over one transport.
 */
export interface Service {
  /**
   * Serves `group` for request tags starting with `prefix` until the current scope closes, over
   * every attached transport. Longest prefix wins, so a `''` route is the catch-all. A prefix can
   * be served once at a time.
   */
  serve<Rpcs extends Rpc.Any, ClientRpcs extends Rpc.Any = Rpcs>(
    prefix: string,
    group: RpcGroup.RpcGroup<Rpcs>,
    options?: ServeOptions<ClientRpcs>,
  ): Effect.Effect<void, never, Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>;

  /** Serves every registered group over `protocol` until the current scope closes. */
  attach(protocol: RpcServer.Protocol['Service']): Effect.Effect<void, never, Scope.Scope>;

  /**
   * One client over every registered group's {@link ServeOptions.inProcessClient}, keyed by rpc tag.
   * Registrations that supply none are absent from it.
   */
  client: Effect.Effect<Client, never, Scope.Scope>;
}

export class RpcRouter extends Context.Service<RpcRouter, Service>()('@dxos/rpc/RpcRouter') {}

/**
 * Serves `group` for request tags starting with `prefix` on the ambient {@link RpcRouter}, over
 * every transport attached to it, until the current scope closes.
 */
export const serve = <Rpcs extends Rpc.Any, ClientRpcs extends Rpc.Any = Rpcs>(
  prefix: string,
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: ServeOptions<ClientRpcs>,
): Effect.Effect<
  void,
  never,
  RpcRouter | Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>
> => Effect.flatMap(RpcRouter, (router) => router.serve(prefix, group, options));

/**
 * Serves every group registered with the ambient {@link RpcRouter} over `protocol`, until the
 * current scope closes.
 */
export const attach = (protocol: RpcServer.Protocol['Service']): Effect.Effect<void, never, RpcRouter | Scope.Scope> =>
  Effect.flatMap(RpcRouter, (router) => router.attach(protocol));

/**
 * One in-process client over every registration of the ambient {@link RpcRouter} that supplies one.
 */
export const client: Effect.Effect<Client, never, RpcRouter | Scope.Scope> = Effect.flatMap(
  RpcRouter,
  (router) => router.client,
);

type Parent = RpcServer.Protocol['Service'];

/** A group's registration: how to run its server, and how to call it in-process. */
type Registration = {
  readonly prefix: string;
  /** Runs the group's server against a transport-supplied protocol for the current scope. */
  readonly run: (protocol: Parent) => Effect.Effect<unknown, never, Scope.Scope>;
  readonly inProcessClient?: Effect.Effect<Client, never, Scope.Scope>;
};

/** A registered group's server on one transport: where to write its client messages, and where to end them. */
type Route = {
  readonly prefix: string;
  write: (clientId: number, data: RpcMessage.FromClientEncoded) => Effect.Effect<void>;
  readonly disconnects: Queue.Queue<number>;
};

type RequestId = string | number;

/** One transport, serving whichever registrations the router currently holds. */
type Transport = {
  readonly addRoute: (registration: Registration) => Effect.Effect<void>;
  readonly removeRoute: (registration: Registration) => Effect.Effect<void>;
};

const makeTransport = (parent: Parent): Effect.Effect<Transport, never, Scope.Scope> =>
  Effect.gen(function* () {
    const transportScope = yield* Effect.scope;
    const routes = new Map<Registration, Route>();
    const routeScopes = new Map<Registration, Scope.Closeable>();
    // Per client: the route that owns each in-flight request, so acks and interrupts follow it.
    const requestRoutes = new Map<number, Map<RequestId, Route>>();
    // Per client: routes that still have to end it after an `Eof` before the transport is ended.
    const pendingEnds = new Map<number, Set<Route>>();

    const routeForTag = (tag: string): Route | undefined => {
      let best: Route | undefined;
      for (const route of routes.values()) {
        if (tag.startsWith(route.prefix) && (best === undefined || route.prefix.length > best.prefix.length)) {
          best = route;
        }
      }
      return best;
    };

    const forgetRequest = (clientId: number, requestId: RequestId) => {
      const requests = requestRoutes.get(clientId);
      requests?.delete(requestId);
      if (requests?.size === 0) {
        requestRoutes.delete(clientId);
      }
    };

    const onRouteEndedClient = (clientId: number, route: Route): Effect.Effect<void> =>
      Effect.suspend(() => {
        const pending = pendingEnds.get(clientId);
        if (!pending?.delete(route) || pending.size > 0) {
          return Effect.void;
        }
        pendingEnds.delete(clientId);
        return parent.end(clientId);
      });

    /**
     * Builds the protocol a group server sees: the transport's send, scoped to what the router routes
     * to it. Effect buffers writes until the server installs its `run` handler, so a request that
     * arrives while the server is still starting is not lost.
     */
    const makeChildProtocol = (route: Route) =>
      RpcServer.Protocol.make((write) =>
        Effect.sync(() => {
          route.write = write;
          return {
            disconnects: route.disconnects,
            send: (clientId, response, transferables) =>
              Effect.suspend(() => {
                if (response._tag === 'Exit') {
                  forgetRequest(clientId, response.requestId);
                }
                return parent.send(clientId, response, transferables);
              }),
            end: (clientId) => onRouteEndedClient(clientId, route),
            clientIds: parent.clientIds,
            initialMessage: parent.initialMessage,
            supportsAck: parent.supportsAck,
            supportsNotifications: parent.supportsNotifications,
            supportsTransferables: parent.supportsTransferables,
            supportsSpanPropagation: parent.supportsSpanPropagation,
            codecFor: parent.codecFor,
          };
        }),
      );

    // A request no route claims still gets a properly encoded "unknown tag" defect: an empty group's
    // server produces it without the router hand-rolling the wire format.
    const fallback: Route = { prefix: '', write: () => Effect.void, disconnects: yield* Queue.make<number>() };
    const fallbackProtocol = yield* makeChildProtocol(fallback);
    yield* RpcServer.make(RpcGroup.make(), { disableTracing: true }).pipe(
      Effect.provideService(RpcServer.Protocol, fallbackProtocol),
      Effect.forkScoped,
    );

    const route = (clientId: number, data: RpcMessage.FromClientEncoded): Effect.Effect<void> => {
      switch (data._tag) {
        case 'Request': {
          const target = routeForTag(data.tag) ?? fallback;
          let requests = requestRoutes.get(clientId);
          if (!requests) {
            requests = new Map();
            requestRoutes.set(clientId, requests);
          }
          requests.set(data.id, target);
          return target.write(clientId, data);
        }
        case 'Ack':
        case 'Interrupt': {
          const target = requestRoutes.get(clientId)?.get(data.requestId);
          return target ? target.write(clientId, data) : Effect.void;
        }
        case 'Ping':
          return parent.send(clientId, RpcMessage.constPong);
        case 'Eof': {
          const targets = [fallback, ...routes.values()];
          pendingEnds.set(clientId, new Set(targets));
          return Effect.forEach(targets, (target) => target.write(clientId, data), { discard: true });
        }
        default:
          return Effect.sync(() => log.warn('rpc router: unknown client message', { data }));
      }
    };

    yield* parent.run(route).pipe(Effect.forkScoped);
    yield* Queue.take(parent.disconnects).pipe(
      Effect.flatMap((clientId) =>
        Effect.forEach([fallback, ...routes.values()], (target) => Queue.offer(target.disconnects, clientId), {
          discard: true,
        }).pipe(
          // A disconnected client has no requests to route and nothing left to end.
          Effect.andThen(
            Effect.sync(() => {
              requestRoutes.delete(clientId);
              pendingEnds.delete(clientId);
            }),
          ),
        ),
      ),
      Effect.forever,
      Effect.forkScoped,
    );

    return {
      addRoute: (registration) =>
        Effect.gen(function* () {
          invariant(!routes.has(registration), `rpc router: registration already routed: '${registration.prefix}'`);
          // The server lives in a scope of its own so the route can be dropped — when its
          // registration closes — without taking the transport's other routes with it.
          const routeScope = yield* Scope.fork(transportScope, 'sequential');
          const route: Route = {
            prefix: registration.prefix,
            write: () => Effect.void,
            disconnects: yield* Queue.make<number>(),
          };
          // Build the protocol before the route is visible: its writer buffers until the server runs,
          // whereas the placeholder above would drop a request that arrives first.
          const protocol = yield* makeChildProtocol(route).pipe(Scope.provide(routeScope));
          routes.set(registration, route);
          routeScopes.set(registration, routeScope);
          yield* registration.run(protocol).pipe(Scope.provide(routeScope), Effect.forkIn(routeScope));
        }),

      removeRoute: (registration) =>
        Effect.suspend(() => {
          const route = routes.get(registration);
          const routeScope = routeScopes.get(registration);
          if (!route || !routeScope) {
            return Effect.void;
          }
          routes.delete(registration);
          routeScopes.delete(registration);
          for (const [clientId, requests] of requestRoutes) {
            for (const [requestId, owner] of requests) {
              if (owner === route) {
                forgetRequest(clientId, requestId);
              }
            }
          }
          return Scope.close(routeScope, Exit.void).pipe(
            // A route closing before its server accepted an `Eof` never ends that client itself, so
            // settle its share here or the last pending route would never end the transport.
            Effect.andThen(
              Effect.forEach([...pendingEnds.keys()], (clientId) => onRouteEndedClient(clientId, route), {
                discard: true,
              }),
            ),
          );
        }),
    };
  });

export const make: Effect.Effect<Service> = Effect.sync(() => {
  const registrations = new Set<Registration>();
  const transports = new Set<Transport>();

  return {
    serve: <Rpcs extends Rpc.Any, ClientRpcs extends Rpc.Any = Rpcs>(
      prefix: string,
      group: RpcGroup.RpcGroup<Rpcs>,
      options?: ServeOptions<ClientRpcs>,
    ) =>
      Effect.gen(function* () {
        // Captured here so the registration carries the handlers (and middleware) its provider
        // supplied, rather than the router resolving them from whatever serves the transport.
        const context = yield* Effect.context<Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>();
        for (const existing of registrations) {
          invariant(existing.prefix !== prefix, `rpc router: prefix already served: '${prefix}'`);
        }
        const { inProcessClient, ...serverOptions } = options ?? {};
        const registration: Registration = {
          prefix,
          run: (protocol) =>
            RpcServer.make(group, serverOptions).pipe(
              Effect.provideService(RpcServer.Protocol, protocol),
              Effect.provide(context),
            ),
          // The registry holds registrations of every group behind one type, so a client typed by
          // its own rpc tags is stored as the tag-keyed record those tags describe.
          inProcessClient: inProcessClient as Effect.Effect<Client, never, Scope.Scope> | undefined,
        };
        registrations.add(registration);
        yield* Effect.addFinalizer(() =>
          Effect.suspend(() => {
            registrations.delete(registration);
            return Effect.forEach(transports, (transport) => transport.removeRoute(registration), { discard: true });
          }),
        );
        yield* Effect.forEach(transports, (transport) => transport.addRoute(registration), { discard: true });
      }),

    attach: (protocol) =>
      Effect.gen(function* () {
        const transport = yield* makeTransport(protocol);
        transports.add(transport);
        yield* Effect.addFinalizer(() => Effect.sync(() => transports.delete(transport)));
        yield* Effect.forEach(registrations, (registration) => transport.addRoute(registration), { discard: true });
      }),

    client: Effect.gen(function* () {
      const merged: Client = {};
      for (const registration of registrations) {
        if (!registration.inProcessClient) {
          continue;
        }
        Object.assign(merged, yield* registration.inProcessClient);
      }
      return merged;
    }),
  };
});

/**
 * Provides the {@link RpcRouter} every service registers into. Transports are attached separately
 * with {@link layerTransport}, so the router can sit beneath the providers and outlive any one
 * connection.
 */
export const layer: Layer.Layer<RpcRouter> = Layer.effect(RpcRouter, make);

/**
 * Serves every group registered with the ambient {@link RpcRouter} over the ambient
 * {@link RpcServer.Protocol}, for the life of the layer.
 */
export const layerTransport: Layer.Layer<never, never, RpcRouter | RpcServer.Protocol> = Layer.effectDiscard(
  Effect.flatMap(RpcServer.Protocol, (protocol) => attach(protocol)),
);
