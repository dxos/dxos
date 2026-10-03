//
// Copyright 2026 DXOS.org
//

import { type CleanupFn, Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { Entity, Obj, Ref, Relation } from '@dxos/echo';
import { QueryAST } from '@dxos/echo-protocol';
import { filterMatchEntity } from '@dxos/echo/internal';
import { BaseError } from '@dxos/errors';
import { EID, type SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { type QuerySource } from './graph-query-context.ts';
import { type SourceEntry } from './query-context.ts';

/**
 * What federated execution needs from the graph.
 */
export interface FederatedGraph {
  /** Whether `spaceId` names a local database rather than a replicated space. */
  isLocal(spaceId: string): spaceId is SpaceId;

  /** Runs a traversal-free query over one local database. */
  queryLocal(spaceId: SpaceId, query: QueryAST.Query): Promise<readonly Entity.Unknown[]>;

  /** Runs a query over replicated spaces (and feeds and the registry) through the graph's own engine. */
  queryReplicated(query: QueryAST.Query): Promise<readonly Entity.Unknown[]>;

  /** Resolves an absolute `echo:` URI in any database. */
  resolve(uri: URI.URI): Promise<Entity.Unknown | undefined>;

  /** Calls `callback` when any database the graph holds changes. */
  subscribe(callback: () => void): CleanupFn;
}

/** The query uses a clause federated execution cannot evaluate across databases. */
export class FederatedQueryError extends BaseError.extend(
  'FederatedQueryError',
  'Clause not supported in a graph query that spans local databases.',
) {}

/**
 * Whether a query names a local database in any `from` scope, which is what routes it here: the
 * replicated engine (working set and host index) cannot see local rows, and a local database cannot
 * see replicated ones, so only the graph can join them.
 */
export const queryTouchesLocal = (ast: QueryAST.Query, isLocal: (spaceId: string) => boolean): boolean => {
  let found = false;
  QueryAST.visit(ast, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      found ||= node.from.scopes.some((scope) => scope._tag === 'space' && !!scope.spaceId && isLocal(scope.spaceId));
    }
  });
  return found;
};

/**
 * Evaluates a query over replicated spaces and local databases together.
 *
 * Every traversal-free subtree (selects and their filters, options, unions and differences) runs
 * inside each database, since entities belong to exactly one database and those clauses distribute
 * over a union of them. The remaining clauses run here over live entities: forward references and
 * relation endpoints resolve through the graph, so they cross databases freely; incoming references,
 * relations and children are found by selecting candidates in every database in scope and matching
 * their references against the anchors; order, skip and limit apply to the merged result.
 */
export class FederatedQueryExecutor {
  constructor(private readonly _graph: FederatedGraph) {}

  async execute(ast: QueryAST.Query): Promise<Entity.Unknown[]> {
    // A clause outside every `from` (a traversal wrapped around a scoped selection) searches the
    // databases the query named anywhere.
    const ambient: QueryAST.Scope[] = [];
    QueryAST.visit(ast, (node) => {
      if (node.type === 'from' && node.from._tag === 'scope') {
        ambient.push(...node.from.scopes);
      }
    });
    return this.#eval(ast, ambient, undefined);
  }

  async #eval(
    node: QueryAST.Query,
    scopes: readonly QueryAST.Scope[],
    options: QueryAST.QueryOptions | undefined,
  ): Promise<Entity.Unknown[]> {
    if (isPushable(node)) {
      return this.#select(node, scopes, options);
    }
    switch (node.type) {
      case 'from': {
        if (node.from._tag !== 'scope') {
          throw new FederatedQueryError({ context: { clause: 'from(query)' } });
        }
        return this.#eval(node.query, node.from.scopes, options);
      }
      case 'options':
        return this.#eval(node.query, scopes, { ...options, ...node.options });
      case 'filter': {
        const selection = await this.#eval(node.selection, scopes, options);
        return selection.filter((entity) => filterMatchEntity(node.filter, entity));
      }
      case 'union':
        return dedupe((await Promise.all(node.queries.map((query) => this.#eval(query, scopes, options)))).flat());
      case 'set-difference': {
        const [source, exclude] = await Promise.all([
          this.#eval(node.source, scopes, options),
          this.#eval(node.exclude, scopes, options),
        ]);
        const excluded = new Set(exclude.map(keyOf));
        return source.filter((entity) => !excluded.has(keyOf(entity)));
      }
      case 'reference-traversal': {
        const anchors = await this.#eval(node.anchor, scopes, options);
        // Loaded through each ref's own resolver, which knows its target even while the stored URI is
        // still relative to the database that made it.
        const targets = await Promise.all(
          anchors.flatMap((anchor) => refsOf(anchor, node.property)).map((ref) => ref.tryLoad()),
        );
        return dedupe(targets.filter(isEntity).filter((entity) => !Entity.isDeleted(entity)));
      }
      case 'incoming-references': {
        const anchors = new Set((await this.#eval(node.anchor, scopes, options)).map(keyOf));
        const candidates = await this.#select(selectType(node.typename), scopes, options);
        return candidates.filter((candidate) =>
          refsOf(candidate, node.property).some((ref) => anchors.has(refTargetKey(ref, spaceOf(candidate)))),
        );
      }
      case 'relation': {
        const anchors = new Set((await this.#eval(node.anchor, scopes, options)).map(keyOf));
        const filter = node.filter ?? selectType(null).filter;
        const candidates = await this.#select({ type: 'select', filter }, scopes, options);
        return candidates.filter((relation) => {
          if (!Relation.isRelation(relation)) {
            return false;
          }
          const space = spaceOf(relation);
          const source = anchors.has(uriKey(Relation.getSourceURI(relation), space));
          const target = anchors.has(uriKey(Relation.getTargetURI(relation), space));
          return node.direction === 'outgoing' ? source : node.direction === 'incoming' ? target : source || target;
        });
      }
      case 'relation-traversal': {
        const relations = (await this.#eval(node.anchor, scopes, options)).filter(Relation.isRelation);
        const uris = relations.flatMap((relation) => {
          const space = spaceOf(relation);
          const source = qualifiedRefUri(Relation.getSourceURI(relation), space);
          const target = qualifiedRefUri(Relation.getTargetURI(relation), space);
          return node.direction === 'source' ? [source] : node.direction === 'target' ? [target] : [source, target];
        });
        return dedupe(await this.#resolveAll(uris));
      }
      case 'hierarchy-traversal': {
        const anchors = await this.#eval(node.anchor, scopes, options);
        if (node.direction === 'to-parent') {
          return dedupe(
            anchors.flatMap((anchor) => {
              const parent = Obj.isObject(anchor) ? Obj.getParent(anchor) : undefined;
              return parent ? [parent] : [];
            }),
          );
        }
        const parents = new Set(anchors.map(keyOf));
        const candidates = await this.#select(selectType(null), scopes, options);
        return candidates.filter((candidate) => {
          const parent = Obj.isObject(candidate) ? Obj.getParent(candidate) : undefined;
          return parent !== undefined && parents.has(keyOf(parent));
        });
      }
      case 'order': {
        const entities = await this.#eval(node.query, scopes, options);
        return [...entities].sort((left, right) => compareBy(node.order, left, right));
      }
      case 'skip':
        return (await this.#eval(node.query, scopes, options)).slice(node.skip);
      case 'limit':
        return (await this.#eval(node.query, scopes, options)).slice(0, node.limit);
      case 'select':
        return this.#select(node, scopes, options);
      case 'aggregate':
        throw new FederatedQueryError({ context: { clause: 'aggregate' } });
    }
  }

  /**
   * Runs a traversal-free subtree inside every database in scope and merges the results.
   */
  async #select(
    node: QueryAST.Query,
    scopes: readonly QueryAST.Scope[],
    options: QueryAST.QueryOptions | undefined,
  ): Promise<Entity.Unknown[]> {
    const query: QueryAST.Query = options ? { type: 'options', query: node, options } : node;
    const localSpaces = new Set<SpaceId>();
    const replicated: QueryAST.Scope[] = [];
    for (const scope of scopes) {
      if (scope._tag === 'space' && scope.spaceId && this._graph.isLocal(scope.spaceId)) {
        localSpaces.add(scope.spaceId);
      } else {
        replicated.push(scope);
      }
    }
    const parts = await Promise.all([
      ...[...localSpaces].map((spaceId) => this._graph.queryLocal(spaceId, query)),
      replicated.length > 0
        ? this._graph.queryReplicated({ type: 'from', query, from: { _tag: 'scope', scopes: replicated } })
        : [],
    ]);
    return dedupe(parts.flat());
  }

  async #resolveAll(uris: readonly URI.URI[]): Promise<Entity.Unknown[]> {
    const resolved = await Promise.all(uris.map((uri) => this._graph.resolve(uri)));
    return resolved.filter(isEntity).filter((entity) => !Entity.isDeleted(entity));
  }
}

/**
 * A {@link QuerySource} over {@link FederatedQueryExecutor}: answers asynchronously and re-executes
 * when any database the graph holds changes.
 */
export class FederatedQuerySource implements QuerySource {
  readonly changed = new Event<void>();
  readonly #executor: FederatedQueryExecutor;
  #query: QueryAST.Query | undefined = undefined;
  #results: SourceEntry[] = [];
  #pending = false;
  #generation = 0;
  #scheduled = false;
  #unsubscribe: CleanupFn | undefined = undefined;

  constructor(private readonly _graph: FederatedGraph) {
    this.#executor = new FederatedQueryExecutor(_graph);
  }

  open(): void {}

  close(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#generation++;
  }

  getResults(): SourceEntry[] {
    return this.#results;
  }

  isSynchronous(): boolean {
    return false;
  }

  isPending(): boolean {
    return this.#query !== undefined && this.#pending;
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<SourceEntry[]> {
    return toEntries(await this.#executor.execute(query));
  }

  update(query: QueryAST.Query): void {
    this.#query = query;
    this.#pending = true;
    this.#unsubscribe ??= this._graph.subscribe(() => this.#schedule());
    this.#refresh();
  }

  /** Coalesces a burst of database changes into one re-execution. */
  #schedule(): void {
    if (this.#scheduled) {
      return;
    }
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.#refresh();
    });
  }

  #refresh(): void {
    const query = this.#query;
    if (!query) {
      return;
    }
    const generation = ++this.#generation;
    this.#executor.execute(query).then(
      (entities) => {
        if (generation === this.#generation) {
          this.#results = toEntries(entities);
          this.#pending = false;
          this.changed.emit();
        }
      },
      (error) => {
        log.catch(error);
        if (generation === this.#generation) {
          this.#pending = false;
          this.changed.emit();
        }
      },
    );
  }
}

const toEntries = (entities: readonly Entity.Unknown[]): SourceEntry[] =>
  entities.map((entity) => ({
    id: entity.id,
    result: entity,
    match: { rank: 1 },
    resolution: { source: 'local', time: 0 },
  }));

/**
 * Clauses that distribute over a union of databases, so each database can evaluate them alone.
 */
const isPushable = (node: QueryAST.Query): boolean => {
  switch (node.type) {
    case 'select':
      return true;
    case 'filter':
      return isPushable(node.selection);
    case 'options':
      return isPushable(node.query);
    case 'union':
      return node.queries.every(isPushable);
    case 'set-difference':
      return isPushable(node.source) && isPushable(node.exclude);
    default:
      return false;
  }
};

/** A select of every entity of a type, or of every entity when `typename` is null. */
const selectType = (typename: URI.URI | null): QueryAST.QuerySelectClause => ({
  type: 'select',
  filter: { type: 'object', typename, props: {} },
});

const isEntity = (value: unknown): value is Entity.Unknown => Entity.isEntity(value);

const spaceOf = (entity: Entity.Unknown): SpaceId | undefined => Entity.getDatabase(entity)?.spaceId;

/** Identity across databases: entity ids are unique, but a database qualifies them. */
const keyOf = (entity: Entity.Unknown): string => `${spaceOf(entity) ?? ''}/${entity.id}`;

/** The {@link keyOf} of a reference's target, reading a relative URI against the referrer's space. */
const uriKey = (uri: string, referrerSpace: SpaceId | undefined): string => {
  const eid = EID.tryParse(uri);
  return eid ? `${EID.getSpaceId(eid) ?? referrerSpace ?? ''}/${EID.getEntityId(eid) ?? ''}` : uri;
};

/** The {@link keyOf} of a ref's target: its live target when resolvable without a read, else its URI. */
const refTargetKey = (ref: Ref.Ref<any>, referrerSpace: SpaceId | undefined): string => {
  const target: unknown = ref.target;
  return isEntity(target) ? keyOf(target) : uriKey(ref.uri, referrerSpace);
};

const qualifiedRefUri = (uri: URI.URI, referrerSpace: SpaceId | undefined): URI.URI => {
  const eid = EID.tryParse(uri);
  const entityId = eid ? EID.getEntityId(eid) : undefined;
  return eid && EID.isLocal(eid) && referrerSpace && entityId ? EID.make({ spaceId: referrerSpace, entityId }) : uri;
};

const dedupe = (entities: readonly Entity.Unknown[]): Entity.Unknown[] => {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = keyOf(entity);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** The refs at `property`, or every ref the entity holds when `property` is null. */
const refsOf = (entity: Entity.Unknown, property: string | null): Ref.Ref<any>[] =>
  collectRefs(property === null ? Object.values(entity) : getDeep(entity, property.split('.')));

const collectRefs = (value: unknown): Ref.Ref<any>[] => {
  if (Ref.isRef(value)) {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectRefs);
  }
  if (value !== null && typeof value === 'object' && !Entity.isEntity(value)) {
    return Object.values(value).flatMap(collectRefs);
  }
  return [];
};

const compareBy = (order: readonly QueryAST.Order[], left: Entity.Unknown, right: Entity.Unknown): number => {
  for (const spec of order) {
    const sign = spec.direction === 'desc' ? -1 : 1;
    const result =
      spec.kind === 'property'
        ? compareValues(getDeep(left, spec.property.split('.')), getDeep(right, spec.property.split('.')))
        : spec.kind === 'natural'
          ? compareValues(left.id, right.id)
          : 0;
    if (result !== 0) {
      return sign * result;
    }
  }
  return 0;
};

/** Undefined sorts last, as SQL `NULLS LAST` does in the database engines. */
const compareValues = (left: unknown, right: unknown): number => {
  if (left === right) {
    return 0;
  }
  if (left === undefined || left === null) {
    return 1;
  }
  if (right === undefined || right === null) {
    return -1;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left).localeCompare(String(right));
};
