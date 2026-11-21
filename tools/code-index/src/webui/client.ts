//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Stream from 'effect/Stream';

import type * as Events from '../workspace/Events.ts';
import type * as IndexState from '../workspace/IndexState.ts';
import * as Protocol from '../workspace/Protocol.ts';

/**
 * The browser's end of the protocol. The same `RpcGroup` the server implements is instantiated
 * here, so payloads are schema-checked on both sides and the UI cannot drift from the server by a
 * field.
 *
 * NDJSON matches the server: a `Watch` response is one chunked body, so the UI sees each event as
 * it is appended rather than when the turn ends.
 */

// The shape is read off `RpcClient.make` rather than written out: the group's method signatures are
// generated from its schemas, and naming them by hand would be a second place to keep in step.
const make = RpcClient.make(Protocol.Rpcs);

class Client extends Context.Service<Client, Effect.Success<typeof make>>()('code-index/webui/Client') {}

// The client is a layer, not a promise: `RpcClient.make` is scoped, and the layer's own scope is
// what keeps its connection alive for the lifetime of the page.
const clientLayer = Layer.effect(Client, make).pipe(
  Layer.provide(
    RpcClient.layerProtocolHttp({ url: Protocol.PATH }).pipe(
      Layer.provide(RpcSerialization.layerNdjson),
      Layer.provide(FetchHttpClient.layer),
    ),
  ),
);

const runtime = ManagedRuntime.make(clientLayer);

/** How long the connection probe waits before reconnecting to a server it lost. */
const RECONNECT = Duration.seconds(2);

const call = <A, E>(body: (client: Effect.Success<typeof make>) => Effect.Effect<A, E>): Promise<A> =>
  runtime.runPromise(Effect.flatMap(Client, body));

/** Everything the UI can ask for, as promises — Solid's primitives take promises, not Effects. */
export const api = {
  info: () => call((client) => client.Info()),

  listProjects: () => call((client) => client.ListProjects()),

  createProject: (title?: string) => call((client) => client.CreateProject({ title })),

  deleteProject: (projectId: string) => call((client) => client.DeleteProject({ projectId })),

  /** What a diagram box's `ref` names in the index: an IRI, or a path, package or symbol name. */
  describe: (target: string) => call((client) => client.Describe({ target })),

  /** The children of each named tree node, in one round trip. */
  treeChildren: (ids: readonly string[]) => call((client) => client.TreeChildren({ ids })),

  /** Cmd+P: public symbols and packages by name, each with its path in the tree. */
  search: (query: string) => call((client) => client.Search({ query })),

  /** Where a node sits in the tree, as the path `Tree.Root.reveal` takes below its root id. */
  treeLocate: (id: string) => call((client) => client.TreeLocate({ id })),

  /** The code behind a tree node, or `undefined` when it has none of its own. */
  treeSource: (id: string) => call((client) => client.TreeSource({ id })),

  /** Sends an event. A `UserMessage` starts a turn; anything else is only recorded. */
  dispatch: (projectId: string, event: Events.Event) => call((client) => client.Dispatch({ projectId, event })),

  /**
   * Subscribes to a project's log — history first, then live. `onEntry` is called for each entry in
   * sequence order; the returned function stops the subscription.
   */
  watch: (projectId: string, after: number, onEntry: (entry: Events.Entry) => void): (() => void) => {
    const fiber = runtime.runFork(
      Effect.flatMap(Client, (client) =>
        client.Watch({ projectId, after }).pipe(Stream.runForEach((entry) => Effect.sync(() => onEntry(entry)))),
      ),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  },

  /**
   * Reports whether the server is reachable: true once the indexer's status stream delivers, false
   * when it ends or fails, then reconnects every `RECONNECT` until it delivers again. The stream is
   * the probe because a server that goes away breaks its open response at once, with no polling.
   */
  watchConnection: (onChange: (connected: boolean) => void): (() => void) => {
    const fiber = runtime.runFork(
      Effect.flatMap(Client, (client) =>
        Effect.forever(
          client.WatchIndex().pipe(
            Stream.runForEach(() => Effect.sync(() => onChange(true))),
            Effect.exit,
            Effect.andThen(Effect.sync(() => onChange(false))),
            Effect.andThen(Effect.sleep(RECONNECT)),
          ),
        ),
      ),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  },

  /** Subscribes to the indexer's status, current value first; the returned function stops it. */
  watchIndex: (onStatus: (status: IndexState.Status) => void): (() => void) => {
    const fiber = runtime.runFork(
      Effect.flatMap(Client, (client) =>
        client.WatchIndex().pipe(Stream.runForEach((status) => Effect.sync(() => onStatus(status)))),
      ),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  },
};
