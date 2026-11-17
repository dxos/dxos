//
// Copyright 2026 DXOS.org
//

import { type CleanupFn, Event } from '@dxos/async';
import { Blob, type Database, type Entity, type Hypergraph, type Ref, Type } from '@dxos/echo';
import { type RefResolverRequest, type RefSource, makeSettledRequest } from '@dxos/echo/internal';
import { type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { UnsupportedOperationError } from './errors.ts';
import { type StoredEntity } from './object-store.ts';
import { type SimpleRegistry } from './registry.ts';

/**
 * What the resolver and graph need from the database.
 */
export interface EntitySource extends Database.Database {
  readonly registry: SimpleRegistry;
  /** The resident instance for a URI, without reading storage. */
  peek(uri: string): Entity.Unknown | undefined;
  /** The instance for a URI, reading its single row when it is not resident. */
  load(uri: string): Promise<Entity.Unknown | undefined>;
  /** The live instance for a row a query of another database in the graph read. */
  hydrateStored(stored: StoredEntity): Promise<Entity.Unknown | undefined>;
  /** Another database of the same space on this file committed writes to these documents. */
  applyCommitted(ids: ReadonlySet<string>): void;
}

/**
 * Resolves refs against one database: synchronously from the working set, asynchronously by loading
 * the one target row. Type URIs resolve against the registry.
 */
export class DatabaseRefResolver implements Ref.Resolver {
  constructor(private readonly _source: EntitySource) {}

  resolve(uri: URI.URI, options: { source: RefSource }): RefResolverRequest {
    const entity = this.resolveSync(uri, false);
    if (entity !== undefined || options.source === 'working-set') {
      return makeSettledRequest(entity ? 'ready' : 'unavailable', entity);
    }
    return new LoadRequest(this.resolveLegacy(uri));
  }

  resolveSync(uri: URI.URI, load: boolean, onLoad?: () => void): Entity.Unknown | undefined {
    const entity = this._source.peek(uri) ?? this._source.registry.getByURI(uri);
    if (entity === undefined && load) {
      void this._source
        .load(uri)
        .then((loaded) => loaded && onLoad?.())
        .catch((error) => log.catch(error));
    }
    return entity;
  }

  async resolveLegacy(uri: URI.URI): Promise<Entity.Unknown | undefined> {
    return (await this._source.load(uri)) ?? this._source.registry.getByURI(uri);
  }

  async resolveSchema(uri: URI.URI) {
    const type = this._source.registry.getByURI(uri);
    return type && Type.isType(type) ? Type.getSchema(type) : undefined;
  }

  async resolveType(uri: URI.URI): Promise<Entity.Unknown | undefined> {
    const type = this._source.registry.getByURI(uri);
    return type && Type.isType(type) ? type : undefined;
  }
}

/**
 * A resolution that settles when its row has been read and hydrated.
 */
class LoadRequest implements RefResolverRequest {
  state: RefResolverRequest['state'] = 'requesting';
  readonly stateChanged = new Event<void>();
  readonly #promise: Promise<Entity.Unknown | undefined>;
  #result: Entity.Unknown | undefined;

  constructor(promise: Promise<Entity.Unknown | undefined>) {
    this.#promise = promise.then(
      (result) => this.#settle(result),
      (error) => {
        log.catch(error);
        return this.#settle(undefined);
      },
    );
  }

  getResult(): Entity.Unknown | undefined {
    return this.state === 'ready' ? this.#result : undefined;
  }

  wait(): Promise<Entity.Unknown | undefined> {
    return this.#promise;
  }

  abort(): void {}

  #settle(result: Entity.Unknown | undefined): Entity.Unknown | undefined {
    this.#result = result;
    this.state = result ? 'ready' : 'unavailable';
    queueMicrotask(() => this.stateChanged.emit());
    return result;
  }
}

/**
 * The graph of the databases opened over one SQLite file: they share a type registry, a query can
 * read any of their spaces in one statement, and each result row hydrates in its own space's
 * database. A database opened alone has a graph of its own.
 */
export class SqliteGraph implements Hypergraph.Hypergraph {
  readonly #registry: SimpleRegistry;
  readonly #databases = new Map<SpaceId, { db: EntitySource; resolver: Ref.Resolver }>();
  /** Every open database, including several of one space, which see each other's commits. */
  readonly #members = new Map<EntitySource, Ref.Resolver>();

  constructor(registry: SimpleRegistry) {
    this.#registry = registry;
  }

  get registry(): SimpleRegistry {
    return this.#registry;
  }

  get defaultBlobStorage(): string {
    return Blob.Storage.inline;
  }

  /** Every space with an open database in the graph. */
  get spaceIds(): SpaceId[] {
    return [...this.#databases.keys()];
  }

  /**
   * Adds a database to the graph until the returned cleanup runs.
   */
  register(db: EntitySource, resolver: Ref.Resolver): CleanupFn {
    this.#databases.set(db.spaceId, { db, resolver });
    this.#members.set(db, resolver);
    return () => {
      this.#members.delete(db);
      if (this.#databases.get(db.spaceId)?.db === db) {
        this.#databases.delete(db.spaceId);
        const other = [...this.#members].find(([member]) => member.spaceId === db.spaceId);
        if (other) {
          this.#databases.set(db.spaceId, { db: other[0], resolver: other[1] });
        }
      }
    };
  }

  /**
   * Tells the other databases of a space that `from` committed writes to these documents, since they
   * read the same file but cache documents and objects of their own.
   */
  notifyCommitted(from: EntitySource, ids: ReadonlySet<string>): void {
    if (ids.size === 0) {
      return;
    }
    for (const member of this.#members.keys()) {
      if (member !== from && member.spaceId === from.spaceId) {
        member.applyCommitted(ids);
      }
    }
  }

  get query(): Database.QueryFn {
    const first = this.#databases.values().next().value;
    if (!first) {
      throw new Error('The graph holds no database to query.');
    }
    return first.db.query;
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    const first = this.#databases.values().next().value;
    if (!first) {
      throw new Error('The graph holds no database to make a ref in.');
    }
    return first.db.makeRef<T>(uri);
  }

  createRefResolver(options: Hypergraph.RefResolverOptions): Ref.Resolver {
    const spaceId = options.context?.space;
    const entry =
      (spaceId !== undefined ? this.#databases.get(spaceId) : undefined) ?? this.#databases.values().next().value;
    if (!entry) {
      throw new Error('The graph holds no database to resolve refs in.');
    }
    return entry.resolver;
  }

  getDatabase(spaceId: SpaceId): Database.Database | undefined {
    return this.#databases.get(spaceId)?.db;
  }

  /** The database of a space, as the graph's members see it. */
  getSource(spaceId: string): EntitySource | undefined {
    for (const [id, entry] of this.#databases) {
      if (id === spaceId) {
        return entry.db;
      }
    }
    return undefined;
  }

  registerBlobBackend(): CleanupFn {
    throw new UnsupportedOperationError('registerBlobBackend');
  }
}
