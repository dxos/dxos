//
// Copyright 2026 DXOS.org
//

import { Entity, Obj, Ref, Relation } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { compareTypenameStrings, filterMatchEntity } from '@dxos/echo/internal';
import { EID, type SpaceId } from '@dxos/keys';

type DeletedMode = NonNullable<QueryAST.QueryOptions['deleted']>;

/**
 * System timestamps tracked per entity (unix ms).
 */
export type Timestamps = { createdAt: number; updatedAt: number };

/**
 * What the engine needs from its database.
 */
export interface QuerySource {
  readonly spaceId: SpaceId | undefined;
  /** Every entity in the working set, deleted ones included. */
  entities(): Iterable<Entity.Unknown>;
  getEntity(id: string): Entity.Unknown | undefined;
  getTimestamps(id: string): Timestamps | undefined;
  /** Entities of the in-process registry, for `Scope.registry()` queries. */
  registryEntities(): Iterable<Entity.Unknown>;
}

/**
 * Error raised for AST clauses this backend does not evaluate (feeds, aggregates, vector search).
 */
export class UnsupportedQueryError extends Error {
  constructor(clause: string) {
    super(`Query clause not supported by echo-sqlite: ${clause}`);
    this.name = 'UnsupportedQueryError';
  }
}

/**
 * Evaluates a query AST in memory against the database working set.
 *
 * Every entity is resident, so each clause is a direct scan; that is the whole point of this
 * backend — no index, no planner, no host.
 */
export const executeQuery = (source: QuerySource, query: QueryAST.Query): Entity.Unknown[] =>
  new Executor(source).run(query, [...source.entities()], 'exclude');

class Executor {
  constructor(private readonly _source: QuerySource) {}

  run(query: QueryAST.Query, candidates: Entity.Unknown[], deleted: DeletedMode): Entity.Unknown[] {
    switch (query.type) {
      case 'select':
        return candidates.filter((entity) => this._isVisible(entity, deleted) && this._match(query.filter, entity));

      case 'filter':
        return this.run(query.selection, candidates, deleted).filter((entity) => this._match(query.filter, entity));

      case 'options':
        return this.run(query.query, candidates, query.options.deleted ?? deleted);

      case 'from':
        return this.run(query.query, this._fromCandidates(query.from, candidates, deleted), deleted);

      case 'reference-traversal':
        return this._visible(
          this.run(query.anchor, candidates, deleted).flatMap((anchor) =>
            collectRefs(readPath(anchor, query.property)).flatMap((ref) => this._resolveRef(ref) ?? []),
          ),
          deleted,
        );

      case 'incoming-references': {
        const anchors = new Set(this.run(query.anchor, candidates, deleted).map((anchor) => anchor.id));
        return this._visible(candidates, deleted).filter((entity) => {
          if (query.typename !== null && !compareTypenameStrings(query.typename, Entity.getTypeURI(entity) ?? '')) {
            return false;
          }
          const value = query.property === null ? Entity.toJSON(entity) : readPath(entity, query.property);
          return collectRefs(value).some((ref) => anchors.has(refTargetId(ref) ?? ''));
        });
      }

      case 'relation': {
        const anchors = new Set(this.run(query.anchor, candidates, deleted).map((anchor) => anchor.id));
        return this._visible(candidates, deleted).filter((entity) => {
          if (!Relation.isRelation(entity)) {
            return false;
          }
          const source = eidEntityId(Relation.getSourceURI(entity));
          const target = eidEntityId(Relation.getTargetURI(entity));
          const connected =
            query.direction === 'outgoing'
              ? anchors.has(source ?? '')
              : query.direction === 'incoming'
                ? anchors.has(target ?? '')
                : anchors.has(source ?? '') || anchors.has(target ?? '');
          return connected && (query.filter === undefined || this._match(query.filter, entity));
        });
      }

      case 'relation-traversal':
        return this._visible(
          this.run(query.anchor, candidates, deleted).flatMap((relation) => {
            if (!Relation.isRelation(relation)) {
              return [];
            }
            const ids = [
              query.direction !== 'target' ? eidEntityId(Relation.getSourceURI(relation)) : undefined,
              query.direction !== 'source' ? eidEntityId(Relation.getTargetURI(relation)) : undefined,
            ];
            return ids.flatMap((id) => (id ? (this._source.getEntity(id) ?? []) : []));
          }),
          deleted,
        );

      case 'hierarchy-traversal': {
        const anchors = this.run(query.anchor, candidates, deleted);
        if (query.direction === 'to-parent') {
          return this._visible(
            anchors.flatMap((anchor) => (Obj.isObject(anchor) ? (Obj.getParent(anchor) ?? []) : [])),
            deleted,
          );
        }
        const ids = new Set(anchors.map((anchor) => anchor.id));
        return this._visible(candidates, deleted).filter(
          (entity) => Obj.isObject(entity) && ids.has(Obj.getParent(entity)?.id ?? ''),
        );
      }

      case 'union':
        return dedupe(query.queries.flatMap((inner) => this.run(inner, candidates, deleted)));

      case 'set-difference': {
        const excluded = new Set(this.run(query.exclude, candidates, deleted).map((entity) => entity.id));
        return this.run(query.source, candidates, deleted).filter((entity) => !excluded.has(entity.id));
      }

      case 'order':
        return this._order(this.run(query.query, candidates, deleted), query.order);

      case 'limit':
        return this.run(query.query, candidates, deleted).slice(0, query.limit);

      case 'skip':
        return this.run(query.query, candidates, deleted).slice(query.skip);

      case 'aggregate':
        throw new UnsupportedQueryError('aggregate');
    }
  }

  private _fromCandidates(
    from: QueryAST.QueryFromClause['from'],
    candidates: Entity.Unknown[],
    deleted: DeletedMode,
  ): Entity.Unknown[] {
    if (from._tag === 'query') {
      return this.run(from.query, candidates, deleted);
    }

    return dedupe(
      from.scopes.flatMap((scope): Entity.Unknown[] => {
        switch (scope._tag) {
          case 'space':
            return scope.spaceId === undefined || scope.spaceId === this._source.spaceId
              ? [...this._source.entities()]
              : [];
          case 'registry':
            return scope.location === 'local' ? [...this._source.registryEntities()] : [];
          case 'feed':
            throw new UnsupportedQueryError('feed scope');
        }
      }),
    );
  }

  private _match(filter: QueryAST.Filter, entity: Entity.Unknown): boolean {
    switch (filter.type) {
      case 'not':
        return !this._match(filter.filter, entity);
      case 'and':
        return filter.filters.every((inner) => this._match(inner, entity));
      case 'or':
        return filter.filters.some((inner) => this._match(inner, entity));
      case 'timestamp': {
        const value = this._source.getTimestamps(entity.id)?.[filter.field];
        if (value === undefined) {
          return false;
        }
        switch (filter.operator) {
          case 'gt':
            return value > filter.value;
          case 'gte':
            return value >= filter.value;
          case 'lt':
            return value < filter.value;
          case 'lte':
            return value <= filter.value;
        }
        return false;
      }
      case 'child-of': {
        const parents = new Set(filter.parents.map((parent) => eidEntityId(parent)));
        let parent = Obj.isObject(entity) ? Obj.getParent(entity) : undefined;
        while (parent) {
          if (parents.has(parent.id)) {
            return true;
          }
          parent = filter.transitive ? Obj.getParent(parent) : undefined;
        }
        return false;
      }
      case 'object':
        return filterMatchEntity(this._resolveInQueries(filter), entity);
      default:
        return filterMatchEntity(filter, entity);
    }
  }

  /**
   * Rewrites nested `in-query` property filters into literal `in` filters, as the shared matcher requires.
   */
  private _resolveInQueries(filter: QueryAST.FilterObject): QueryAST.FilterObject {
    const entries = Object.entries(filter.props);
    if (!entries.some(([, value]) => value.type === 'in-query')) {
      return filter;
    }
    const props = Object.fromEntries(
      entries.map(([key, value]): [string, QueryAST.Filter] => {
        if (value.type !== 'in-query') {
          return [key, value];
        }
        const values = this.run(value.subquery, [...this._source.entities()], 'exclude').map((entity) =>
          value.property === 'id' ? entity.id : readPath(entity, value.property),
        );
        return [key, { type: 'in', values }];
      }),
    );
    return { ...filter, props };
  }

  private _isVisible(entity: Entity.Unknown, deleted: DeletedMode): boolean {
    const isDeleted = Entity.isDeleted(entity);
    return deleted === 'include' || (deleted === 'only' ? isDeleted : !isDeleted);
  }

  private _visible(entities: Entity.Unknown[], deleted: DeletedMode): Entity.Unknown[] {
    return dedupe(entities.filter((entity) => this._isVisible(entity, deleted)));
  }

  private _resolveRef(ref: Ref.Unknown | { '/': string }): Entity.Unknown | undefined {
    const id = refTargetId(ref);
    return id ? this._source.getEntity(id) : undefined;
  }

  private _order(entities: Entity.Unknown[], order: readonly QueryAST.Order[]): Entity.Unknown[] {
    const keyOf = (entity: Entity.Unknown, spec: QueryAST.Order): unknown => {
      switch (spec.kind) {
        case 'natural':
          return entity.id;
        case 'property':
          return readPath(entity, spec.property);
        case 'timestamp':
          return this._source.getTimestamps(entity.id)?.[spec.field];
        case 'rank':
          return 0;
      }
    };

    return [...entities].sort((left, right) => {
      for (const spec of order) {
        const result = compareValues(keyOf(left, spec), keyOf(right, spec));
        if (result !== 0) {
          return spec.direction === 'asc' ? result : -result;
        }
      }
      return 0;
    });
  }
}

/** Undefined sorts last in ascending order, matching SQL `NULLS LAST`. */
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
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }
  return typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right));
};

const dedupe = (entities: Entity.Unknown[]): Entity.Unknown[] => {
  const seen = new Set<string>();
  return entities.filter((entity) => !seen.has(entity.id) && (seen.add(entity.id), true));
};

/** Reads a dot-separated property path. */
const readPath = (entity: Entity.Unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) => (value !== null && typeof value === 'object' ? Reflect.get(value, key) : undefined),
      entity,
    );

/** Refs held by a value: a live `Ref`, an encoded `{ '/': uri }`, or arrays / records of them. */
const collectRefs = (
  value: unknown,
  out: (Ref.Unknown | { '/': string })[] = [],
): (Ref.Unknown | { '/': string })[] => {
  if (Ref.isRef(value)) {
    out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, out));
  } else if (value !== null && typeof value === 'object') {
    if ('/' in value && typeof value['/'] === 'string') {
      out.push({ '/': value['/'] });
    } else {
      Object.values(value).forEach((item) => collectRefs(item, out));
    }
  }
  return out;
};

const refTargetId = (ref: Ref.Unknown | { '/': string }): string | undefined =>
  eidEntityId(Ref.isRef(ref) ? ref.uri : ref['/']);

const eidEntityId = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
