//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type CleanupFn } from '@dxos/async';
import { type BlobBackend } from '@dxos/blob';
import { BaseError } from '@dxos/errors';
import { type URI } from '@dxos/keys';

import * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import type * as Key from './Key.ts';
import type * as Ref from './Ref.ts';
import type * as Registry from './Registry.ts';

/**
 * Resolution context.
 * Affects how non-absolute DXNs are resolved.
 */
export interface RefResolutionContext {
  /**
   * Space that the resolution is happening from.
   */
  space?: Key.SpaceId;

  /**
   * Feed that the resolution is happening from.
   * This feed will be searched first, and then the space it belongs to.
   */
  feed?: URI.URI;
}

export interface RefResolverOptions {
  /**
   * Resolution context.
   * Affects how non-absolute DXNs are resolved.
   */
  context?: RefResolutionContext;
}

/**
 * Manages cross-space database interactions.
 */
export interface Hypergraph extends Database.Queryable {
  /**
   * In-process registry of keyed objects and static schema types.
   * Populated at startup via `registry.add(objects)` / `registry.add(schemas)`.
   * Queries that include no explicit from() clause will fan out to this registry automatically.
   */
  get registry(): Registry.Registry;

  /**
   * Query objects.
   */
  query: Database.QueryFn;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromURI`
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T>;

  /**
   * Create a resolver that dereferences `Ref`s against this graph. Persisted schema objects are
   * surfaced as their registered `Type.Type` entity.
   */
  createRefResolver(options: RefResolverOptions): Ref.Resolver;

  /**
   * Get a database by space ID.
   * @returns The database for the given space ID, or undefined if not found.
   */
  getDatabase(spaceId: Key.SpaceId): Database.Database | undefined;

  /**
   * Registers a pluggable blob storage backend under `name`, claiming its declared URI schemes.
   * Registering a scheme already claimed by another backend is an error.
   *
   * @param options.default - When true, `name` becomes the storage used when
   *   `Blob.fromBytes`'s `storage` option is omitted.
   * @returns A cleanup function that unregisters the backend.
   */
  registerBlobBackend(name: string, backend: BlobBackend, options?: { default?: boolean }): CleanupFn;

  /**
   * Storage name `Blob.fromBytes` uses when its `storage` option is omitted. Starts as `'inline'`;
   * reflects the most recent `registerBlobBackend(name, backend, { default: true })` call.
   */
  get defaultBlobStorage(): string;
}

/**
 * Effect service tag for Hypergraph dependency injection.
 *
 * Distinct from {@link Database.Service}, which carries one space's database: an operation
 * declaring the database is declaring that it acts on a space, and callers that cannot name one
 * (a harness hook fires a fixed payload) are refused before the handler runs. This service is the
 * cross-space handle — query every space, or reach one by id with `getDatabase` — for the work
 * that has to find its own space rather than be told it.
 */
export class Service extends Context.Service<
  Service,
  {
    readonly graph: Hypergraph;
  }
>()('@dxos/echo/Hypergraph/Service') {}

/**
 * Layer that provides a Hypergraph service that throws when accessed. The default where no graph
 * exists, so a host that never wires one fails loudly at the call rather than silently resolving
 * nothing.
 */
export const notAvailable = Layer.succeed(Service, {
  get graph(): Hypergraph {
    throw new globalThis.Error('Hypergraph not available');
  },
});

/** Creates a Hypergraph service instance from a graph. */
export const makeService = (graph: Hypergraph): Service['Service'] => ({
  get graph() {
    return graph;
  },
});

/** Creates a Layer that provides the Hypergraph service. */
export const layer = (graph: Hypergraph): Layer.Layer<Service> => Layer.succeed(Service, makeService(graph));

/** The graph holds no database for the requested space — it is not open, or does not exist. */
export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'Space not found.') {}

/**
 * Narrows the graph to one space's {@link Database.Service}.
 *
 * The bridge between the two services: work that had to *find* a space still wants to be written
 * with the ordinary space-scoped API once it has one, and every caller doing that by hand would
 * otherwise reimplement the same lookup-and-fail. The space id is resolved when the layer is built,
 * so a missing space fails there rather than at the first query.
 */
export const withDatabase = (spaceId: Key.SpaceId): Layer.Layer<Database.Service, SpaceNotFoundError, Service> =>
  Layer.effect(
    Database.Service,
    Effect.gen(function* () {
      const { graph } = yield* Service;
      const db = graph.getDatabase(spaceId);
      if (!db) {
        return yield* Effect.fail(new SpaceNotFoundError({ context: { spaceId } }));
      }
      return Database.makeService(db);
    }),
  );
