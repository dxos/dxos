//
// Copyright 2026 DXOS.org
//

import { type CleanupFn, Event } from '@dxos/async';
import { Blob, type Database, type Entity, type Hypergraph, type Ref, Type } from '@dxos/echo';
import { type RefResolverRequest, type RefSource, makeSettledRequest } from '@dxos/echo/internal';
import { type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';

import { UnsupportedOperationError } from './errors.ts';
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
 * The single-database graph a database belongs to.
 */
export class SqliteHypergraph implements Hypergraph.Hypergraph {
  constructor(
    private readonly _db: EntitySource,
    private readonly _resolver: Ref.Resolver,
  ) {}

  get registry(): SimpleRegistry {
    return this._db.registry;
  }

  get defaultBlobStorage(): string {
    return Blob.Storage.inline;
  }

  get query(): Database.QueryFn {
    return this._db.query;
  }

  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T> {
    return this._db.makeRef<T>(uri);
  }

  createRefResolver(_options: Hypergraph.RefResolverOptions): Ref.Resolver {
    return this._resolver;
  }

  getDatabase(spaceId: SpaceId): Database.Database | undefined {
    return spaceId === this._db.spaceId ? this._db : undefined;
  }

  registerBlobBackend(): CleanupFn {
    throw new UnsupportedOperationError('registerBlobBackend');
  }
}
