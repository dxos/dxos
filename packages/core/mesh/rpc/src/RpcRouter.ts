//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcMessage from 'effect/unstable/rpc/RpcMessage';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ServeOptions = NonNullable<Parameters<typeof RpcServer.make>[1]>;

/**
 * One transport, many rpc groups that come and go. Each {@link serve} call runs a full
 * `RpcServer` for its group behind a child protocol; the router owns the transport's protocol and
 * forwards every client message to the child whose prefix matches the request tag.
 */
export interface Service {
  /**
   * Serves `group` for request tags starting with `prefix` until the current scope closes.
   * Longest prefix wins, so a `''` route is the catch-all. A prefix can be served once at a time.
   */
  serve<Rpcs extends Rpc.Any>(
    prefix: string,
    group: RpcGroup.RpcGroup<Rpcs>,
    options?: ServeOptions,
  ): Effect.Effect<void, never, Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>;
}

export class RpcRouter extends Context.Service<RpcRouter, Service>()('@dxos/rpc/RpcRouter') {}

export const serve = <Rpcs extends Rpc.Any>(
  prefix: string,
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: ServeOptions,
): Effect.Effect<
  void,
  never,
  RpcRouter | Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>
> => Effect.flatMap(RpcRouter, (router) => router.serve(prefix, group, options));

type Parent = RpcServer.Protocol['Service'];

/** A registered group server: where to write its client messages and where to end its clients. */
type Route = {
  readonly prefix: string;
  write: (clientId: number, data: RpcMessage.FromClientEncoded) => Effect.Effect<void>;
  readonly disconnects: Queue.Queue<number>;
};

type RequestId = string | number;

export const make: Effect.Effect<Service, never, RpcServer.Protocol | Scope.Scope> = Effect.gen(function* () {
  const parent = yield* RpcServer.Protocol;
  const routes = new Map<string, Route>();
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
          supportsTransferables: parent.supportsTransferables,
          supportsSpanPropagation: parent.supportsSpanPropagation,
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
      }),
    ),
    Effect.forever,
    Effect.forkScoped,
  );

  return {
    serve: (prefix, group, options) =>
      Effect.gen(function* () {
        invariant(!routes.has(prefix), `rpc router: prefix already served: '${prefix}'`);
        const route: Route = { prefix, write: () => Effect.void, disconnects: yield* Queue.make<number>() };
        // Build the protocol before the route is visible: its writer buffers until the server runs,
        // whereas the placeholder above would drop a request that arrives first.
        const protocol = yield* makeChildProtocol(route);
        routes.set(prefix, route);
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            routes.delete(prefix);
            for (const [clientId, requests] of requestRoutes) {
              for (const [requestId, owner] of requests) {
                if (owner === route) {
                  forgetRequest(clientId, requestId);
                }
              }
            }
          }),
        );
        // The group server lives in a scope forked from the caller's: closing the caller's scope
        // interrupts its in-flight requests and removes the route.
        const serverScope = yield* Scope.fork(yield* Effect.scope, 'sequential');
        yield* RpcServer.make(group, options).pipe(
          Effect.provideService(RpcServer.Protocol, protocol),
          Effect.provideService(Scope.Scope, serverScope),
          Effect.forkIn(serverScope),
        );
      }),
  };
});

/**
 * Provides {@link RpcRouter} over the current {@link RpcServer.Protocol}.
 */
export const layer: Layer.Layer<RpcRouter, never, RpcServer.Protocol> = Layer.effect(RpcRouter, make);
