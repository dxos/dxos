//
// Copyright 2025 DXOS.org
//

import type { AutomergeUrl, DocumentId } from '@automerge/automerge-repo';
import type * as SqlClient from '@effect/sql/SqlClient';
import type * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';

import { ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import { type Obj, Query } from '@dxos/echo';
import {
  DatabaseDirectory,
  EncodedReference,
  type EntityPropPath,
  EntityStructure,
  type QueryAST,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { ATTR_PARENT, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET } from '@dxos/echo/internal';
import { EffectEx, type RuntimeProvider } from '@dxos/effect';
import { type EntityMeta, EscapedPropPath, type IndexEngine, type ReverseRef } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryReactivity, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { compositeKey, getDeep, isNonNullable } from '@dxos/util';

import type { AutomergeHost } from '../automerge';
import type { SpaceStateManager } from '../db-host';
import { type InvalidationHint, canonicalTypename } from '../db-host/invalidation-hint';
import { filterMatchDoc, filterMatchObjectJSON } from '../filter';
import { QueryError } from './errors';
import { type GroupAggregates, GroupBy, type GroupKeyValue } from './group-by';
import { QueryPlan } from './plan';
import { QueryPlanner } from './query-planner';

type QueryExecutorOptions = {
  indexEngine: IndexEngine;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;

  queryId: string;
  query: QueryAST.Query;
  reactivity: QueryReactivity;
};

type QueryExecutionResult = {
  /**
   * Whether the query results have changed since the last execution.
   */
  changed: boolean;
};

/**
 * Represents an item in the query working set during execution.
 */
type QueryItem = {
  objectId: EntityId;

  spaceId: SpaceId;
  queueId: EntityId | null;
  queueNamespace: string | null;

  // For objects from automerge documents.
  documentId: DocumentId | null;

  // For objects from automerge documents.
  doc: EntityStructure | null;

  // For objects from queues.
  data: Obj.JSON | null;

  /**
   * Relevance rank for this item.
   * Higher values indicate better matches for FTS/vector searches.
   * Defaults to 1 for non-ranked queries (predicate matches).
   */
  rank: number;

  /**
   * System timestamps from the object meta index (unix ms), used for `timestamp` ordering.
   * Null when the index has not recorded a timestamp for the item.
   */
  createdAt: number | null;
  updatedAt: number | null;

  /**
   * Group key, set by `AggregateStep`. Undefined for queries without an `aggregate` clause; `{}` for
   * an aggregate clause with no `group` entries (a single group over the whole input).
   */
  groupKey?: GroupKeyValue;

  /**
   * Named group aggregates, stamped by `AggregateStep` when the query declares non-`items` aggregates;
   * shared by every member of a group and read by a following group-level `OrderStep`.
   */
  aggregates?: GroupAggregates;
};

const QueryItem = Object.freeze({
  /**
   * Checks if the item is deleted.
   * Only applies to this item, not its parents.
   */
  isDeleted: (item: QueryItem) => {
    if (item.doc) {
      return EntityStructure.isDeleted(item.doc);
    } else if (item.data) {
      return item.data['@deleted'] === true;
    } else {
      throw new Error('Invalid query item');
    }
  },

  getProperty: (item: QueryItem, property: EntityPropPath) => {
    if (item.doc) {
      return getDeep(item.doc.data, property);
    } else if (item.data) {
      return getDeep(item.data, property);
    } else {
      throw new Error('Invalid query item');
    }
  },

  /**
   * Computes the composite group key for this item from the aggregate's `group`-kind entries, keyed
   * by result field name. No `group` entries yields `{}` — a single group over the whole input.
   */
  getGroupKey: (item: QueryItem, aggregates: readonly QueryAST.GroupAggregate[]): GroupKeyValue => {
    const key: GroupKeyValue = {};
    for (const aggregate of aggregates) {
      if (aggregate.kind === 'group') {
        key[aggregate.name] = GroupBy.coerceKeyComponent(QueryItem.getProperty(item, [aggregate.property!]));
      }
    }
    return key;
  },

  getParent: (item: QueryItem): EID.EID | undefined => {
    let raw: string | undefined;
    if (item.doc) {
      raw = EntityStructure.getParent(item.doc)?.['/'];
    } else if (item.data) {
      raw = item.data[ATTR_PARENT];
    } else {
      throw new Error('Invalid query item');
    }
    return raw !== undefined ? EID.tryParse(raw) : undefined;
  },

  getRelationSource: (item: QueryItem): EID.EID | undefined => {
    let raw: string | undefined;
    if (item.doc) {
      raw = EntityStructure.getRelationSource(item.doc)?.['/'];
    } else if (item.data) {
      raw = item.data[ATTR_RELATION_SOURCE];
    } else {
      throw new Error('Invalid query item');
    }
    return raw !== undefined ? EID.tryParse(raw) : undefined;
  },

  getRelationTarget: (item: QueryItem): EID.EID | undefined => {
    let raw: string | undefined;
    if (item.doc) {
      raw = EntityStructure.getRelationTarget(item.doc)?.['/'];
    } else if (item.data) {
      raw = item.data[ATTR_RELATION_TARGET];
    } else {
      throw new Error('Invalid query item');
    }
    return raw !== undefined ? EID.tryParse(raw) : undefined;
  },

  /**
   * EIDs of objects this item strongly depends on: the schema object (when the type is an
   * ECHO object reference), relation source/target, and the parent. Mirrors
   * `ObjectCore.getStrongDependencies` on the client. Queue items hydrate from indexed
   * snapshots and don't gate on dependency loads, so they report no strong deps.
   */
  getStrongDependencies: (item: QueryItem): EID.EID[] => {
    if (!item.doc) {
      return [];
    }
    const res: EID.EID[] = [];
    const push = (ref: EncodedReference | undefined) => {
      if (!ref) {
        return;
      }
      try {
        const uri = EID.tryParse(EncodedReference.toURI(ref));
        if (uri) {
          res.push(uri);
        }
      } catch {
        log.warn('invalid reference', { ref: ref['/'] });
      }
    };
    push(EntityStructure.getTypeReference(item.doc));
    if (EntityStructure.getEntityKind(item.doc) === 'relation') {
      push(EntityStructure.getRelationSource(item.doc));
      push(EntityStructure.getRelationTarget(item.doc));
    }
    push(EntityStructure.getParent(item.doc));
    return res;
  },
});

/**
 * Recursive data structure that represents the execution trace of a query.
 */
export type ExecutionTrace = {
  name: string;
  details: string;

  objectCount: number;
  documentsLoaded: number;
  indexHits: number;

  beginTs: number;
  endTs: number;

  executionTime: number;
  indexQueryTime: number;
  documentLoadTime: number;

  children: ExecutionTrace[];
};

export const ExecutionTrace = Object.freeze({
  makeEmpty: (): ExecutionTrace => ({
    name: 'Empty',
    details: '',
    objectCount: 0,
    documentsLoaded: 0,
    indexHits: 0,
    beginTs: 0,
    endTs: 0,
    indexQueryTime: 0,
    documentLoadTime: 0,
    executionTime: 0,
    children: [],
  }),
  markEnd: (trace: ExecutionTrace) => {
    trace.endTs = performance.now();
    trace.executionTime = trace.endTs - trace.beginTs;
  },
  putOnPerformanceTimeline: (trace: ExecutionTrace) => {
    performance.measure(trace.name, {
      start: trace.beginTs,
      end: trace.endTs,
      detail: {
        devtools: {
          dataType: 'track-entry',
          track: 'Query Execution',
          trackGroup: 'ECHO', // Group related tracks together
          color: 'tertiary-dark',
          properties: [
            ['objectCount', trace.objectCount],
            ['documentsLoaded', trace.documentsLoaded],
            ['index hits', trace.indexHits],
            ['indexQueryTime', trace.indexQueryTime],
            ['documentLoadTime', trace.documentLoadTime],
          ],
          tooltipText: trace.details,
        },
      },
    });
    for (const child of trace.children) {
      ExecutionTrace.putOnPerformanceTimeline(child);
    }
  },
  format: (trace: ExecutionTrace): string => {
    const go = (trace: ExecutionTrace, indent: number): string => {
      return [
        `${' '.repeat(indent)} - ${trace.name}(${trace.details})`,
        `${' '.repeat(indent)}   objects: ${trace.objectCount}  docs: ${trace.documentsLoaded}  index hits: ${trace.indexHits} | total: ${trace.executionTime.toFixed(0)}ms  index: ${trace.indexQueryTime.toFixed(0)}ms  load: ${trace.documentLoadTime.toFixed(0)}ms`,
        '',
        ...trace.children.map((child) => go(child, indent + 2)),
      ].join('\n');
    };
    return go(trace, 0);
  },
});

type StepExecutionResult = {
  workingSet: QueryItem[];
  trace: ExecutionTrace;
};

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    DX_TRACE_QUERY_EXECUTION: string;
  }
}

const TRACE_QUERY_EXECUTION = !!import.meta.env?.DX_TRACE_QUERY_EXECUTION;

const MAX_DEPTH_FOR_DELETION_TRACING = 10;
const MAX_DEPTH_FOR_CHILD_OF_TRACING = 10;
const MAX_DEPTH_FOR_STRONG_DEP_TRACING = 10;

/**
 * Cached scope constraints extracted from a query plan.
 * Used to quickly determine whether an invalidation hint can affect this query.
 *
 * A null dimension means the query is unconstrained on that dimension (matches any value).
 */
type QueryScopes = {
  /**
   * False for text-search, traversal, union, set-difference, or child-of queries.
   * When false, matchesHint always returns true (conservative: always re-execute).
   */
  isSimple: boolean;
  spaceIds: Set<SpaceId> | null;
  queueIds: Set<EntityId> | null;
  typenames: Set<string> | null;
  objectIds: Set<EntityId> | null;
};

const extractScopes = (plan: QueryPlan.Plan): QueryScopes => {
  const scopes: QueryScopes = {
    isSimple: true,
    spaceIds: null,
    queueIds: null,
    typenames: null,
    objectIds: null,
  };

  for (const step of plan.steps) {
    switch (step._tag) {
      case 'SelectStep': {
        // Extract spaceIds from space-scoped entries.
        const spaceScopes = step.scope.filter((scope): scope is QueryAST.SpaceScope => scope._tag === 'space');
        if (spaceScopes.length > 0) {
          if (!scopes.spaceIds) {
            scopes.spaceIds = new Set();
          }
          for (const spaceScope of spaceScopes) {
            scopes.spaceIds.add(spaceScope.spaceId as SpaceId);
          }
        }

        // Extract queueIds from feed-scoped entries and derive spaceIds from them.
        const feedScopesForExtract = step.scope.filter((scope): scope is QueryAST.FeedScope => scope._tag === 'feed');
        const hasIncludeAllFeeds = spaceScopes.some((s) => s.includeAllFeeds === true);
        if (feedScopesForExtract.length > 0 && !hasIncludeAllFeeds) {
          let parseFailed = false;
          const derivedQueueIds = new Set<EntityId>();
          const derivedSpaceIds = new Set<SpaceId>();
          for (const feedEntry of feedScopesForExtract) {
            const echoUri = EID.tryParse(String(feedEntry.feedUri));
            if (echoUri) {
              const queueId = EID.getEntityId(echoUri);
              const spaceId = EID.getSpaceId(echoUri);
              if (queueId) {
                derivedQueueIds.add(queueId);
              }
              if (spaceId) {
                derivedSpaceIds.add(spaceId);
              }
            } else {
              parseFailed = true;
            }
          }

          if (!parseFailed) {
            if (derivedQueueIds.size > 0) {
              scopes.queueIds ??= new Set<EntityId>();
              for (const id of derivedQueueIds) {
                scopes.queueIds.add(id);
              }
            }
            if (derivedSpaceIds.size > 0) {
              scopes.spaceIds ??= new Set<SpaceId>();
              for (const id of derivedSpaceIds) {
                // Derive spaceId from the queue DXN so space-scoped hints can skip this query.
                scopes.spaceIds.add(id);
              }
            }
          }
          // On any parse error, leave queue-derived dimensions unconstrained.
        }

        // Extract typename / objectId constraints from selector.
        switch (step.selector._tag) {
          case 'TypeSelector': {
            if (step.selector.inverted) {
              // Inverted type selectors come from Filter.not — mark as non-simple.
              scopes.isSimple = false;
            } else {
              if (!scopes.typenames) {
                scopes.typenames = new Set();
              }
              for (const typename of step.selector.typename) {
                scopes.typenames.add(canonicalTypename(typename as string));
              }
            }
            break;
          }
          case 'IdSelector': {
            if (!scopes.objectIds) {
              scopes.objectIds = new Set();
            }
            for (const id of step.selector.objectIds) {
              scopes.objectIds.add(id);
            }
            break;
          }
          case 'TextSelector': {
            scopes.isSimple = false;
            break;
          }
          default:
            // WildcardSelector, TimestampSelector — no type/id constraint.
            break;
        }
        break;
      }
      case 'FilterStep': {
        // child-of filters require transitive parent traversal which can't be hinted.
        if (step.filter.type === 'child-of') {
          scopes.isSimple = false;
        }
        break;
      }
      case 'TraverseStep':
      case 'UnionStep':
      case 'SetDifferenceStep':
        scopes.isSimple = false;
        break;
      default:
        // ClearWorkingSetStep, FilterDeletedStep, OrderStep, LimitStep are fine.
        break;
    }
  }

  return scopes;
};

/** True when any select step (including those nested in UnionStep/SetDifferenceStep subplans) scopes the owning space with {@link QueryAST.SpaceScope.includeAllFeeds}. */
const extractIncludeAllFeeds = (plan: QueryPlan.Plan): boolean => {
  for (const step of plan.steps) {
    if (step._tag === 'SelectStep') {
      for (const scope of step.scope) {
        if (scope._tag === 'space' && scope.includeAllFeeds === true) {
          return true;
        }
      }
    } else if (step._tag === 'UnionStep') {
      if (step.plans.some((subplan) => extractIncludeAllFeeds(subplan))) {
        return true;
      }
    } else if (step._tag === 'SetDifferenceStep') {
      if (extractIncludeAllFeeds(step.source) || extractIncludeAllFeeds(step.exclude)) {
        return true;
      }
    }
  }
  return false;
};

const setsOverlap = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean => {
  const [smaller, larger]: [ReadonlySet<T>, ReadonlySet<T>] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) {
      return true;
    }
  }
  return false;
};

const overlapsOrUnconstrained = <T>(hintSet: ReadonlySet<T> | undefined, scopeSet: Set<T> | null): boolean =>
  hintSet === undefined || scopeSet === null || setsOverlap(hintSet, scopeSet);

/**
 * Serializes a possibly-absent group key for `changed` diffing. `undefined` (non-grouped
 * queries) serializes to a distinct sentinel so it never collides with a real (empty) group key.
 */
const _serializeOptionalGroupKey = (key: GroupKeyValue | undefined): string =>
  key === undefined ? '\0' : GroupBy.serializeGroupKey(key);

/** True once the working set has been partitioned by an AggregateStep (every item carries a group key). */
const isGrouped = (workingSet: QueryItem[]): boolean => workingSet.length > 0 && workingSet[0].groupKey !== undefined;

// Non-null assertion is sound: only called from group-aware limit/skip, which run exclusively on a
// working set already partitioned by AggregateStep (guarded by `isGrouped`), where every item has a key.
const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeGroupKey(item.groupKey!);

/**
 * Executes query plans against the IndexEngine and AutomergeHost.
 *
 * The QueryExecutor is responsible for:
 * - Executing query plans step by step
 * - Managing the working set of query results
 * - Loading documents from the database
 * - Tracking execution performance metrics
 * - Handling different types of query operations (select, filter, traverse, etc.)
 */
export class QueryExecutor extends Resource {
  private readonly _indexEngine: IndexEngine;
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  private readonly _automergeHost: AutomergeHost;
  private readonly _spaceStateManager: SpaceStateManager;
  /**
   * Id of this query.
   */
  private readonly _id: string;
  private readonly _query: QueryAST.Query;
  // TODO(dmaretskyi): Might be used in the future.
  private readonly _reactivity: QueryReactivity;

  private _plan: QueryPlan.Plan;
  #scopes: QueryScopes;
  readonly #includeAllFeeds: boolean;
  private _trace: ExecutionTrace = ExecutionTrace.makeEmpty();
  private _lastResultSet: QueryItem[] = [];

  constructor(options: QueryExecutorOptions) {
    super();

    this._indexEngine = options.indexEngine;
    this._runtime = options.runtime;
    this._automergeHost = options.automergeHost;
    this._spaceStateManager = options.spaceStateManager;

    this._id = options.queryId;
    this._query = options.query;
    this._reactivity = options.reactivity;

    const queryPlanner = new QueryPlanner();
    this._plan = queryPlanner.createPlan(this._query);
    this.#scopes = extractScopes(this._plan);
    this.#includeAllFeeds = extractIncludeAllFeeds(this._plan);
  }

  get queryId(): string {
    return this._id;
  }

  get query(): QueryAST.Query {
    return this._query;
  }

  get plan(): QueryPlan.Plan {
    return this._plan;
  }

  get trace(): ExecutionTrace {
    return this._trace;
  }

  getResults(): QueryResult[] {
    // Computed over the final (post-filter) result set so counts always match shipped records.
    const groupCounts = new Map<string, number>();
    for (const item of this._lastResultSet) {
      if (item.groupKey === undefined) {
        continue;
      }
      const serialized = GroupBy.serializeGroupKey(item.groupKey);
      groupCounts.set(serialized, (groupCounts.get(serialized) ?? 0) + 1);
    }

    return this._lastResultSet.map((item): QueryResult => {
      const serializedGroupKey = item.groupKey !== undefined ? GroupBy.serializeGroupKey(item.groupKey) : undefined;
      return {
        id: item.objectId,
        documentId: item.documentId ?? undefined,
        queueId: item.queueId ?? undefined,
        queueNamespace: item.queueNamespace ?? undefined,
        spaceId: item.spaceId,

        rank: item.rank,

        documentJson: item.doc ? JSON.stringify(item.doc) : item.data ? JSON.stringify(item.data) : undefined,

        groupKey: serializedGroupKey,
        groupCount: serializedGroupKey !== undefined ? groupCounts.get(serializedGroupKey) : undefined,
      };
    });
  }

  /**
   * Returns true if the given invalidation hint could affect this query's result set.
   * When false, the query can safely be skipped for this invalidation cycle.
   *
   * Conservative: returns true for complex queries (traversals, text-search, unions) and
   * for any dimension where either the hint or the query is unconstrained.
   */
  matchesHint(hint: InvalidationHint): boolean {
    if (!this.#scopes.isSimple) {
      return true;
    }
    return (
      overlapsOrUnconstrained(hint.spaceIds, this.#scopes.spaceIds) &&
      overlapsOrUnconstrained(hint.queueIds, this.#scopes.queueIds) &&
      overlapsOrUnconstrained(hint.typenames, this.#scopes.typenames) &&
      overlapsOrUnconstrained(hint.objectIds, this.#scopes.objectIds)
    );
  }

  async execQuery(): Promise<QueryExecutionResult> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    log('exec query', {
      queryId: this._id,
      query: Query.pretty(Query.fromAst(this._query)),
    });

    const prevResultSet = this._lastResultSet;
    const { workingSet: rawWorkingSet, trace } = await this._execPlan(this._plan, []);
    // Omit objects whose strong deps cannot be resolved from local state so they
    // never reach the client, where hydration would fail or stall on them.
    const workingSet = await this._filterUnresolvableStrongDeps(rawWorkingSet);
    this._lastResultSet = workingSet;
    trace.name = 'Root';
    trace.details = JSON.stringify({ id: this._id, query: Query.pretty(Query.fromAst(this._query)) });
    this._trace = trace;

    const changed =
      prevResultSet.length !== workingSet.length ||
      prevResultSet.some(
        (item, index) =>
          workingSet[index].objectId !== item.objectId ||
          workingSet[index].spaceId !== item.spaceId ||
          workingSet[index].documentId !== item.documentId ||
          workingSet[index].queueId !== item.queueId ||
          workingSet[index].queueNamespace !== item.queueNamespace ||
          // A property edit can move an item between groups without changing its flat position
          // (e.g. the last item of group A becomes the first item of group B at the same index).
          _serializeOptionalGroupKey(workingSet[index].groupKey) !== _serializeOptionalGroupKey(item.groupKey),
      );

    // Disabled because concurrent queries don't print hierarchies correctly.
    // ExecutionTrace.putOnPerformanceTimeline(trace);

    if (TRACE_QUERY_EXECUTION) {
      // eslint-disable-next-line no-console
      console.log(ExecutionTrace.format(trace));
    }

    return {
      changed,
    };
  }

  private async _execPlan(plan: QueryPlan.Plan, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const trace = ExecutionTrace.makeEmpty();
    for (const step of plan.steps) {
      if (this._ctx.disposed) {
        throw new ContextDisposedError();
      }

      const result = await this._execStep(step, workingSet);
      workingSet = result.workingSet;
      trace.children.push(result.trace);
    }
    trace.objectCount = workingSet.length;
    ExecutionTrace.markEnd(trace);
    return { workingSet, trace };
  }

  private async _execStep(step: QueryPlan.Step, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    if (this._ctx.disposed) {
      return { workingSet, trace: ExecutionTrace.makeEmpty() };
    }
    let newWorkingSet: QueryItem[], trace: ExecutionTrace;

    const begin = performance.now();
    switch (step._tag) {
      case 'ClearWorkingSetStep':
        newWorkingSet = [];
        trace = ExecutionTrace.makeEmpty();
        break;
      case 'SelectStep':
        ({ workingSet: newWorkingSet, trace } = await this._execSelectStep(step, workingSet));
        break;
      case 'FilterStep':
        ({ workingSet: newWorkingSet, trace } = await this._execFilterStep(step, workingSet));
        break;
      case 'FilterDeletedStep':
        ({ workingSet: newWorkingSet, trace } = await this._execFilterDeletedStep(step, workingSet));
        break;
      case 'UnionStep':
        ({ workingSet: newWorkingSet, trace } = await this._execUnionStep(step, workingSet));
        break;
      case 'SetDifferenceStep':
        ({ workingSet: newWorkingSet, trace } = await this._execSetDifferenceStep(step, workingSet));
        break;
      case 'TraverseStep':
        ({ workingSet: newWorkingSet, trace } = await this._execTraverseStep(step, workingSet));
        break;
      case 'OrderStep':
        ({ workingSet: newWorkingSet, trace } = await this._execOrderStep(step, workingSet));
        break;
      case 'LimitStep':
        ({ workingSet: newWorkingSet, trace } = await this._execLimitStep(step, workingSet));
        break;
      case 'SkipStep':
        ({ workingSet: newWorkingSet, trace } = await this._execSkipStep(step, workingSet));
        break;
      case 'AggregateStep':
        ({ workingSet: newWorkingSet, trace } = await this._execAggregateStep(step, workingSet));
        break;
      default:
        throw new Error(`Unknown step type: ${(step as any)._tag}`);
    }
    trace.beginTs = begin;
    ExecutionTrace.markEnd(trace);

    return { workingSet: newWorkingSet, trace };
  }

  private async _execSelectStep(step: QueryPlan.SelectStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    workingSet = [...workingSet];

    const execSpaceScopes = step.scope.filter((s): s is QueryAST.SpaceScope => s._tag === 'space');
    const spaces = execSpaceScopes.map((s) => s.spaceId as SpaceId);
    const queues = step.scope.filter((s): s is QueryAST.FeedScope => s._tag === 'feed').map((s) => String(s.feedUri));
    const allQueuesFromSpaces = execSpaceScopes.some((s) => s.includeAllFeeds === true);

    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'Select',
      details: JSON.stringify(step.selector),
      beginTs: performance.now(),
    };

    switch (step.selector._tag) {
      case 'WildcardSelector': {
        const beginIndexQuery = performance.now();
        const queueIds = extractQueueIds(queues);
        const metas = await this._queryAllFromSqlIndex(spaces, allQueuesFromSpaces, queueIds);
        trace.indexHits = metas.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterSqlQuery(metas);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable));
        trace.objectCount = workingSet.length;

        break;
      }

      case 'IdSelector': {
        const beginLoad = performance.now();

        if (allQueuesFromSpaces && spaces.length > 0) {
          const objectIds = step.selector.objectIds.filter((id) => EntityId.isValid(id));
          if (objectIds.length > 0) {
            const metas = await this._runInRuntime(this._indexEngine.queryObjectIds({ spaceIds: spaces, objectIds }));
            const results = await this._loadDocumentsAfterSqlQuery(metas);
            trace.documentLoadTime += performance.now() - beginLoad;
            workingSet.push(...results.filter(isNonNullable));
            trace.objectCount = workingSet.length;
            break;
          }
        }

        const items = await Promise.all(
          step.selector.objectIds.map((id) => {
            if (!EntityId.isValid(id)) {
              return null;
            }
            if (queues.length > 0) {
              const spaceId = extractSpaceIdFromQueue(queues[0]);
              const queueId = extractQueueIds([queues[0]])?.[0];
              if (spaceId && queueId) {
                return this._loadQueueItemById(spaceId, queueId, id);
              }
              return null;
            } else if (spaces.length > 0) {
              return this._loadFromDXN(EID.make({ entityId: id }), { sourceSpaceId: spaces[0] });
            } else {
              return null; // Unknown scope.
            }
          }),
        );
        trace.documentLoadTime += performance.now() - beginLoad;

        workingSet.push(...items.filter(isNonNullable));
        trace.objectCount = workingSet.length;
        break;
      }

      case 'TypeSelector': {
        const beginIndexQuery = performance.now();
        const queueIds = extractQueueIds(queues);
        const metas = await this._queryTypesFromSqlIndex(
          spaces,
          step.selector.typename,
          step.selector.inverted,
          allQueuesFromSpaces,
          queueIds,
        );
        trace.indexHits = metas.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterSqlQuery(metas);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable));
        trace.objectCount = workingSet.length;

        break;
      }

      case 'TimestampSelector': {
        const beginIndexQuery = performance.now();
        const queueIds = extractQueueIds(queues);
        const metas = await this._runInRuntime(
          this._indexEngine.queryByTimeRange({
            spaceIds: spaces,
            updatedAfter: step.selector.updatedAfter,
            updatedBefore: step.selector.updatedBefore,
            createdAfter: step.selector.createdAfter,
            createdBefore: step.selector.createdBefore,
            includeAllQueues: allQueuesFromSpaces,
            queueIds,
          }),
        );
        trace.indexHits = metas.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterSqlQuery(metas);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable));
        trace.objectCount = workingSet.length;

        break;
      }

      case 'TextSelector': {
        // TODO(dmaretskyi): type + FTS queries would be very common so we should support those, maybe chunk the fts index.
        // TODO(dmaretskyi): nice to have matched text snippets/highlighting.
        if (step.selector.searchKind === 'vector') {
          // Vector search is not currently supported.
          log.warn('Vector search is not supported');
          break;
        }

        // Full-text search using SQLite FTS5.
        const beginIndexQuery = performance.now();
        invariant(spaces.length <= 1, 'Multiple spaces are not supported for full-text search');
        const queueIds = extractQueueIds(queues);
        const textResults = await this._runInRuntime(
          this._indexEngine.queryText({
            query: step.selector.text,
            spaceId: spaces,
            includeAllQueues: allQueuesFromSpaces,
            queueIds,
          }),
        );
        trace.indexHits = textResults.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        // Load documents from the results.
        const documentLoadStart = performance.now();

        // Separate queue items from space items.
        const queueResults = textResults.filter((r) => r.queueId);
        const spaceResults = textResults.filter((r) => !r.queueId);

        // Build a map from recordId to rank for all FTS results.
        const rankMap = new Map(textResults.map((r) => [r.recordId, r.rank]));

        // Load queue items from indexed snapshots.
        let queueItems: QueryItem[] = [];
        if (queueResults.length > 0) {
          const snapshots = await this._runInRuntime(
            this._indexEngine.querySnapshotsJSON(queueResults.map((r) => r.recordId)),
          );
          const snapshotMap = new Map(snapshots.map((s) => [s.recordId, s.snapshot]));
          queueItems = queueResults
            .map((result): QueryItem | null => {
              const snapshot = snapshotMap.get(result.recordId);
              if (!snapshot || typeof snapshot !== 'object') {
                return null;
              }
              if (!EntityId.isValid(result.queueId)) {
                return null;
              }
              return {
                objectId: result.objectId,
                spaceId: result.spaceId,
                queueId: result.queueId,
                queueNamespace: result.queueNamespace || null,
                documentId: null,
                doc: null,
                data: snapshot as Obj.JSON,
                rank: rankMap.get(result.recordId) ?? 1,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
              };
            })
            .filter(isNonNullable);
        }

        // Load space items from documents.
        const spaceItems = await Promise.all(
          spaceResults.map(async (result): Promise<QueryItem | null> => {
            const dxn = EID.make({ entityId: result.objectId });
            const item = await this._loadFromDXN(dxn, { sourceSpaceId: result.spaceId });
            if (item) {
              // Override the default rank with the FTS rank.
              item.rank = rankMap.get(result.recordId) ?? 1;
            }
            return item;
          }),
        );

        const items = [...queueItems, ...spaceItems.filter(isNonNullable)];
        trace.documentsLoaded += items.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(
          ...items.filter((item) => {
            if (spaces.includes(item.spaceId)) {
              return true;
            }
            if (item.queueId) {
              return queues.some((queueRef) => {
                const queueId = extractQueueIds([queueRef])?.[0];
                const spaceId = extractSpaceIdFromQueue(queueRef);
                return queueId === item.queueId && spaceId === item.spaceId;
              });
            }
            return false;
          }),
        );
        trace.objectCount = workingSet.length;
        break;
      }

      default:
        throw new Error(`Unknown selector type: ${(step.selector as any)._tag}`);
    }

    // Apply limit if specified on the select step.
    if (step.limit !== undefined && workingSet.length > step.limit) {
      workingSet = workingSet.slice(0, step.limit);
      trace.objectCount = workingSet.length;
    }

    return { workingSet, trace };
  }

  private async _execFilterStep(step: QueryPlan.FilterStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    if (step.filter.type === 'child-of') {
      return this._execChildOfFilterStep(step.filter, workingSet);
    }

    const timestampParams = extractTimestampParams(step.filter);
    if (timestampParams !== null) {
      return this._execTimestampFilterStep(step, workingSet, timestampParams);
    }

    if (filterContainsTimestamp(step.filter)) {
      throw new QueryError({
        message:
          'Timestamp filter in unsupported composition (not, or). Use Filter.updated/Filter.created with explicit range instead.',
        context: {},
      });
    }

    const result = workingSet.filter((item) => {
      if (item.doc) {
        return filterMatchDoc(step.filter, {
          id: item.objectId,
          spaceId: item.spaceId,
          doc: item.doc,
        });
      } else if (item.data) {
        return filterMatchObjectJSON(step.filter, item.data);
      } else {
        return false;
      }
    });

    return {
      workingSet: result,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Filter',
        details: JSON.stringify(step.filter),
        objectCount: result.length,
      },
    };
  }

  private async _execTimestampFilterStep(
    step: QueryPlan.FilterStep,
    workingSet: QueryItem[],
    params: { updatedAfter?: number; updatedBefore?: number; createdAfter?: number; createdBefore?: number },
  ): Promise<StepExecutionResult> {
    const spaces = [...new Set(workingSet.map((item) => item.spaceId).filter(isNonNullable))];
    const metas = await this._runInRuntime(
      this._indexEngine.queryByTimeRange({
        spaceIds: spaces,
        ...params,
        includeAllQueues: false,
        queueIds: [],
      }),
    );
    const matchingIds = new Set(metas.map((m) => m.objectId));
    const result = workingSet.filter((item) => matchingIds.has(item.objectId));
    return {
      workingSet: result,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Filter(timestamp)',
        details: JSON.stringify(params),
        objectCount: result.length,
      },
    };
  }

  private async _execFilterDeletedStep(
    step: QueryPlan.FilterDeletedStep,
    workingSet: QueryItem[],
  ): Promise<StepExecutionResult> {
    const expected = step.mode === 'only-deleted';

    const deletedState = workingSet.map((item) => QueryItem.isDeleted(item));
    await Promise.all(
      workingSet.map(async (item, index) => {
        if (deletedState[index]) {
          return;
        }
        deletedState[index] ||= await this._getTransitiveDeletionState(item, MAX_DEPTH_FOR_DELETION_TRACING);
      }),
    );

    const result = workingSet.filter((item, index) => deletedState[index] === expected);

    // TODO(dmaretskyi): How do we handle items with parents and cascade deletions? -- perhaps we forbid queue items from having parents -- i.e. queue is their parent.
    return {
      workingSet: result,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'FilterDeleted',
        details: step.mode,
        objectCount: result.length,
      },
    };
  }

  private async _execChildOfFilterStep(
    filter: QueryAST.FilterChildOf,
    workingSet: QueryItem[],
  ): Promise<StepExecutionResult> {
    const parentObjectIds = new Set<string>();
    for (const parentDxnStr of filter.parents) {
      const echoUri = EID.tryParse(parentDxnStr);
      if (echoUri) {
        const objectId = EID.getEntityId(echoUri);
        if (objectId) {
          parentObjectIds.add(objectId);
        }
      }
    }
    const maxDepth = filter.transitive ? MAX_DEPTH_FOR_CHILD_OF_TRACING : 1;

    const matches = await Promise.all(
      workingSet.map(async (item) => this._isChildOfAny(item, parentObjectIds, maxDepth)),
    );
    const result = workingSet.filter((_item, index) => matches[index]);

    return {
      workingSet: result,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Filter(child-of)',
        details: JSON.stringify({ parents: filter.parents, transitive: filter.transitive }),
        objectCount: result.length,
      },
    };
  }

  /**
   * Checks if an item is a child of any of the given parent object IDs.
   * Walks up the parent chain (and feed ownership for queue items) until a match is found or depth is exhausted.
   */
  private async _isChildOfAny(item: QueryItem, parentObjectIds: Set<string>, remainingDepth: number): Promise<boolean> {
    if (remainingDepth <= 0) {
      return false;
    }

    const parentRefs: { dxnStr: EID.EID; objectId: string }[] = [];

    const directParent = QueryItem.getParent(item);
    if (directParent) {
      const objectId = EID.getEntityId(directParent);
      if (objectId) {
        parentRefs.push({ dxnStr: directParent, objectId });
      }
    }

    if (item.queueId && !directParent) {
      const queueEchoUri = EID.make({ spaceId: item.spaceId, entityId: item.queueId });
      parentRefs.push({
        dxnStr: queueEchoUri,
        objectId: item.queueId,
      });
    }

    for (const ref of parentRefs) {
      if (parentObjectIds.has(ref.objectId)) {
        return true;
      }
    }

    for (const ref of parentRefs) {
      const parentItem = await this._loadFromDXN(ref.dxnStr, { sourceSpaceId: item.spaceId });
      if (parentItem && (await this._isChildOfAny(parentItem, parentObjectIds, remainingDepth - 1))) {
        return true;
      }
    }

    return false;
  }

  // TODO(dmaretskyi): This needs to be completed.
  private async _execTraverseStep(step: QueryPlan.TraverseStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'Traverse',
      details: JSON.stringify(step.traversal),
    };

    const newWorkingSet: QueryItem[] = [];

    switch (step.traversal._tag) {
      case 'ReferenceTraversal': {
        switch (step.traversal.direction) {
          case 'outgoing': {
            invariant(step.traversal.property !== null, 'Outgoing reference traversal requires a property');
            const property = EscapedPropPath.unescape(step.traversal.property);

            const refs = workingSet
              .flatMap((item) => {
                const ref = QueryItem.getProperty(item, property);
                const refs = Array.isArray(ref) ? ref : [ref];
                return refs.map((ref) => {
                  try {
                    return isEncodedReference(ref)
                      ? {
                          ref: EncodedReference.toURI(ref),
                          spaceId: item.spaceId,
                        }
                      : null;
                  } catch {
                    log.warn('invalid reference', { ref: ref['/'] });
                    return null;
                  }
                });
              })
              .filter(isNonNullable);

            const beginLoad = performance.now();
            const items = await Promise.all(
              refs.map(({ ref, spaceId }) => this._loadReferencedTarget(ref, { sourceSpaceId: spaceId })),
            );
            trace.documentLoadTime += performance.now() - beginLoad;

            newWorkingSet.push(...items.filter(isNonNullable));
            trace.objectCount = newWorkingSet.length;

            break;
          }
          case 'incoming': {
            const beginIndexQuery = performance.now();
            const metas = await this._queryIncomingReferencesFromSqlIndex(workingSet, step.traversal.property);
            trace.indexHits += metas.length;
            trace.indexQueryTime += performance.now() - beginIndexQuery;

            const documentLoadStart = performance.now();
            const results = await this._loadDocumentsAfterSqlQuery(metas);
            trace.documentsLoaded += results.length;
            trace.documentLoadTime += performance.now() - documentLoadStart;

            newWorkingSet.push(...results.filter(isNonNullable));
            trace.objectCount = newWorkingSet.length;

            break;
          }
        }
        break;
      }
      case 'RelationTraversal': {
        switch (step.traversal.direction) {
          case 'relation-to-source':
          case 'relation-to-target': {
            const refs = workingSet
              .map((item) => {
                const dxn =
                  step.traversal.direction === 'relation-to-source'
                    ? QueryItem.getRelationSource(item)
                    : QueryItem.getRelationTarget(item);
                if (!dxn) {
                  return null;
                }
                return {
                  ref: dxn,
                  spaceId: item.spaceId,
                };
              })
              .filter(isNonNullable);

            const beginLoad = performance.now();
            const items = await Promise.all(
              refs.map(({ ref, spaceId }) => this._loadFromDXN(ref, { sourceSpaceId: spaceId })),
            );
            trace.documentLoadTime += performance.now() - beginLoad;

            newWorkingSet.push(...items.filter(isNonNullable));
            trace.objectCount = newWorkingSet.length;

            break;
          }

          case 'source-to-relation':
          case 'target-to-relation': {
            const beginIndexQuery = performance.now();
            const metas = await this._queryRelationsFromSqlIndex(
              workingSet,
              step.traversal.direction === 'source-to-relation' ? 'source' : 'target',
            );
            trace.indexHits += metas.length;
            trace.indexQueryTime += performance.now() - beginIndexQuery;

            const documentLoadStart = performance.now();
            const results = await this._loadDocumentsAfterSqlQuery(metas);
            trace.documentsLoaded += results.length;
            trace.documentLoadTime += performance.now() - documentLoadStart;

            newWorkingSet.push(...results.filter(isNonNullable));
            trace.objectCount = newWorkingSet.length;

            break;
          }
        }
        break;
      }
      case 'HierarchyTraversal': {
        switch (step.traversal.direction) {
          case 'to-parent': {
            // Traverse from child to parent using the parent reference in the document.
            const refs = workingSet
              .map((item) => {
                if (!item.doc) {
                  return null; // TODO(dmaretskyi): Queue items not supported here.
                }
                const ref = EntityStructure.getParent(item.doc);
                if (!EncodedReference.isEncodedReference(ref)) {
                  return null;
                }
                return {
                  ref: EncodedReference.toURI(ref),
                  spaceId: item.spaceId,
                };
              })
              .filter(isNonNullable);

            const beginLoad = performance.now();
            const items = await Promise.all(
              refs.map(({ ref, spaceId }) => this._loadFromDXN(ref, { sourceSpaceId: spaceId })),
            );
            trace.documentLoadTime += performance.now() - beginLoad;

            newWorkingSet.push(...items.filter(isNonNullable));
            trace.objectCount = newWorkingSet.length;
            break;
          }

          case 'to-children': {
            // Traverse from parent to children using the SQL index.
            // Covers both standard parent/child hierarchy (via the `parent` field) and
            // feed -> queue items (via the `queueId` field — a feed's queue id matches the feed's object id).
            // Group working set by spaceId.
            const bySpace = new Map<SpaceId, EntityId[]>();
            for (const item of workingSet) {
              const existing = bySpace.get(item.spaceId);
              if (existing) {
                existing.push(item.objectId);
              } else {
                bySpace.set(item.spaceId, [item.objectId]);
              }
            }

            const beginIndexQuery = performance.now();
            const allMetas: EntityMeta[] = [];
            for (const [spaceId, parentIds] of bySpace) {
              const children = await this._runInRuntime(
                this._indexEngine.queryChildren({ spaceId: [spaceId], parentIds }),
              );
              allMetas.push(...children);
            }
            trace.indexHits += allMetas.length;
            trace.indexQueryTime += performance.now() - beginIndexQuery;

            const documentLoadStart = performance.now();
            const results = await this._loadDocumentsAfterSqlQuery(allMetas);
            trace.documentsLoaded += results.filter(isNonNullable).length;
            trace.documentLoadTime += performance.now() - documentLoadStart;

            newWorkingSet.push(...results.filter(isNonNullable));
            trace.objectCount = newWorkingSet.length;
            break;
          }
        }
        break;
      }
      default:
        throw new Error(`Unknown traversal type: ${(step.traversal as any)._tag}`);
    }

    return { workingSet: newWorkingSet, trace };
  }

  private async _execUnionStep(step: QueryPlan.UnionStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const results = new Map<EntityId, QueryItem>();

    const resultSets = await Promise.all(step.plans.map((plan) => this._execPlan(plan, [...workingSet])));

    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'Union',
    };

    // NOTE: Doing insertion after execution to ensure deterministic results. Probably not needed.
    for (const resultSet of resultSets) {
      for (const item of resultSet.workingSet) {
        // Could be duplicate object ids in different spaces or in different epochs of the same space.
        results.set(compositeKey(item.spaceId, String(item.documentId), item.objectId), item);
      }
      trace.children.push(resultSet.trace);
    }

    return {
      workingSet: [...results.values()],
      trace,
    };
  }

  private async _execSetDifferenceStep(
    step: QueryPlan.SetDifferenceStep,
    workingSet: QueryItem[],
  ): Promise<StepExecutionResult> {
    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'SetDifference',
    };

    const sourceResult = await this._execPlan(step.source, [...workingSet]);
    const excludeResult = await this._execPlan(step.exclude, [...workingSet]);
    trace.children.push(sourceResult.trace, excludeResult.trace);

    return {
      workingSet: sourceResult.workingSet.filter((item) => {
        const index = excludeResult.workingSet.findIndex((i) => i.objectId === item.objectId);
        return index === -1;
      }),
      trace,
    };
  }

  private async _execOrderStep(step: QueryPlan.OrderStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    // After an AggregateStep the working set is partitioned into contiguous groups; a post-group order
    // reorders whole groups (by their aggregates), and a pushed-down limit pages over whole groups.
    // Otherwise it sorts and slices the flat object stream.
    let sortedWorkingSet = isGrouped(workingSet)
      ? GroupBy.orderGroups(workingSet, serializeItemGroupKey, (a, b) => this._compareMultiOrder(a, b, step.order))
      : [...workingSet].sort((a, b) => this._compareMultiOrder(a, b, step.order));

    // Apply limit if specified on the order step.
    if (step.limit !== undefined && sortedWorkingSet.length > step.limit) {
      sortedWorkingSet = isGrouped(sortedWorkingSet)
        ? GroupBy.takeGroups(sortedWorkingSet, step.limit, serializeItemGroupKey)
        : sortedWorkingSet.slice(0, step.limit);
    }

    return {
      workingSet: sortedWorkingSet,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Order',
        details: JSON.stringify({ order: step.order, limit: step.limit }),
        objectCount: sortedWorkingSet.length,
      },
    };
  }

  private async _execLimitStep(step: QueryPlan.LimitStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    // After an AggregateStep the working set is partitioned into contiguous groups; limit then pages
    // over whole groups. Otherwise it slices the flat object stream.
    const limitedWorkingSet = isGrouped(workingSet)
      ? GroupBy.takeGroups(workingSet, step.limit, serializeItemGroupKey)
      : workingSet.slice(0, step.limit);

    return {
      workingSet: limitedWorkingSet,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Limit',
        details: JSON.stringify({ limit: step.limit }),
        objectCount: limitedWorkingSet.length,
      },
    };
  }

  private async _execSkipStep(step: QueryPlan.SkipStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const skippedWorkingSet = isGrouped(workingSet)
      ? GroupBy.dropGroups(workingSet, step.skip, serializeItemGroupKey)
      : workingSet.slice(step.skip);

    return {
      workingSet: skippedWorkingSet,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Skip',
        details: JSON.stringify({ skip: step.skip }),
        objectCount: skippedWorkingSet.length,
      },
    };
  }

  private async _execAggregateStep(
    step: QueryPlan.AggregateStep,
    workingSet: QueryItem[],
  ): Promise<StepExecutionResult> {
    const withKeys = workingSet.map((item) => ({ ...item, groupKey: QueryItem.getGroupKey(item, step.aggregates) }));
    const partitioned = GroupBy.partitionByGroupKey(withKeys, (item) => GroupBy.serializeGroupKey(item.groupKey!));
    const groupedWorkingSet = GroupBy.withGroupAggregates(
      partitioned,
      (item) => GroupBy.serializeGroupKey(item.groupKey!),
      step.aggregates,
      (item, property) => QueryItem.getProperty(item, [property]),
    );

    return {
      workingSet: groupedWorkingSet,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Aggregate',
        details: JSON.stringify({ aggregates: step.aggregates }),
        objectCount: groupedWorkingSet.length,
      },
    };
  }

  private _compareMultiOrder(a: QueryItem, b: QueryItem, orders: readonly QueryAST.Order[]): number {
    // Short circuit for common cases.
    if (orders.length === 0) {
      return 0;
    } else if (orders.length === 1) {
      return this._compareByOrder(a, b, orders[0]);
    }

    for (const order of orders) {
      const comparison = this._compareByOrder(a, b, order);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  }

  private _compareByOrder(a: QueryItem, b: QueryItem, order: QueryAST.Order): number {
    switch (order.kind) {
      case 'natural': {
        const comparison = a.objectId.localeCompare(b.objectId);
        return order.direction === 'desc' ? -comparison : comparison;
      }
      case 'property': {
        const comparison = this._compareByProperty(a, b, order.property);
        return order.direction === 'desc' ? -comparison : comparison;
      }
      case 'rank': {
        // Higher rank = better match. By default, descending order (best first).
        const comparison = a.rank - b.rank;
        return order.direction === 'desc' ? -comparison : comparison;
      }
      case 'timestamp': {
        // Order by the system createdAt/updatedAt timestamp from the meta index.
        // Missing timestamps sort as oldest (0).
        const aValue = (order.field === 'updatedAt' ? a.updatedAt : a.createdAt) ?? 0;
        const bValue = (order.field === 'updatedAt' ? b.updatedAt : b.createdAt) ?? 0;
        const comparison = aValue - bValue;
        return order.direction === 'desc' ? -comparison : comparison;
      }
      default:
        // Should never reach here with proper TypeScript types.
        return 0;
    }
  }

  private _compareByProperty(a: QueryItem, b: QueryItem, property: string): number {
    // On a grouped working set, a property order names a group field: prefer a stamped scalar
    // aggregate (max/min/count) when present, else fall through to the member/row property (which
    // also covers ordering by a group-key component, shared by every member).
    const aValue =
      a.aggregates && property in a.aggregates ? a.aggregates[property] : QueryItem.getProperty(a, [property]);
    const bValue =
      b.aggregates && property in b.aggregates ? b.aggregates[property] : QueryItem.getProperty(b, [property]);

    // Both null or undefined
    if (aValue == null && bValue == null) {
      return 0;
    }

    // Only a is null/undefined
    if (aValue == null) {
      return 1;
    }

    // Only b is null/undefined
    if (bValue == null) {
      return -1;
    }

    // Both strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue);
    }

    // Both numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue;
    }

    // Both booleans
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return aValue === bValue ? 0 : aValue ? 1 : -1;
    }

    // Fallback: convert to strings and compare
    return String(aValue).localeCompare(String(bValue));
  }

  private async _runInRuntime<T>(effect: Effect.Effect<T, unknown, SqlClient.SqlClient>): Promise<T> {
    const runtimeProvider = this._runtime;
    invariant(runtimeProvider, 'SQL runtime is required.');
    const runtime = await EffectEx.runAndForwardErrors(runtimeProvider);
    return await EffectEx.unwrapExit(await effect.pipe(Runtime.runPromiseExit(runtime)));
  }

  private async _queryAllFromSqlIndex(
    spaceIds: readonly SpaceId[],
    includeAllQueues: boolean,
    queueIds: readonly EntityId[] | null,
  ): Promise<readonly EntityMeta[]> {
    return await this._runInRuntime(this._indexEngine.queryAll({ spaceIds, includeAllQueues, queueIds }));
  }

  private async _queryTypesFromSqlIndex(
    spaceIds: readonly SpaceId[],
    typeDxns: readonly URI.URI[],
    inverted: boolean,
    includeAllQueues: boolean,
    queueIds: readonly EntityId[] | null,
  ): Promise<readonly EntityMeta[]> {
    return await this._runInRuntime(
      this._indexEngine.queryTypes({ spaceIds, typeDxns, inverted, includeAllQueues, queueIds }),
    );
  }

  private static _anchorTargetDxn(item: QueryItem): EID.EID {
    // Queue items are indexed with fully-qualified DXNs; local `echo:/<id>` anchors miss them.
    if (item.queueId != null) {
      return EID.make({ spaceId: item.spaceId, entityId: item.objectId });
    }
    return EID.make({ entityId: item.objectId });
  }

  private async _queryIncomingReferencesFromSqlIndex(
    workingSet: QueryItem[],
    property: EscapedPropPath | null,
  ): Promise<readonly EntityMeta[]> {
    const anchorDxns = workingSet.map((item) => QueryExecutor._anchorTargetDxn(item));
    const rows: readonly ReverseRef[] = (
      await Promise.all(
        anchorDxns.map((targetDXN) => this._runInRuntime(this._indexEngine.queryReverseRef({ targetDXN }))),
      )
    ).flat();

    const recordIds = rows
      .filter((row) => {
        if (property === null) {
          return true;
        }

        const queryPath = EscapedPropPath.unescape(property);
        const rowPath = EscapedPropPath.unescape(row.propPath);
        return QueryExecutor._matchesReferencePropertyPath(rowPath, queryPath);
      })
      .map((row) => row.recordId);

    const uniqueRecordIds = Array.from(new Set<number>(recordIds));
    return await this._runInRuntime(this._indexEngine.lookupByRecordIds(uniqueRecordIds));
  }

  /**
   * Matches a reverse-reference row path against a query property path.
   * Allows numeric segments in the row path (array indices) that are not present in the query.
   *
   * Examples:
   * - query: ['assignee'] matches row: ['assignee'] and ['assignee', '0'].
   * - query: ['items', 'assignee'] matches row: ['items', '0', 'assignee'].
   * - query: ['a', 'b'] does NOT match row: ['a'].
   * - query: ['a'] does NOT match row: ['a', 'b'].
   */
  private static _matchesReferencePropertyPath(rowPath: readonly string[], queryPath: readonly string[]): boolean {
    const isNumericSegment = (segment: string) => /^[0-9]+$/.test(segment);

    let i = 0; // queryPath index.
    let j = 0; // rowPath index.

    while (i < queryPath.length && j < rowPath.length) {
      if (rowPath[j] === queryPath[i]) {
        i++;
        j++;
        continue;
      }

      // Row may contain array indices that aren't present in the query path.
      if (isNumericSegment(rowPath[j])) {
        j++;
        continue;
      }

      return false;
    }

    // Must consume full query path.
    if (i !== queryPath.length) {
      return false;
    }

    // Any remaining row segments must be numeric (array indices).
    for (; j < rowPath.length; j++) {
      if (!isNumericSegment(rowPath[j])) {
        return false;
      }
    }

    return true;
  }

  private async _queryRelationsFromSqlIndex(
    workingSet: QueryItem[],
    endpoint: 'source' | 'target',
  ): Promise<readonly EntityMeta[]> {
    const anchorDxns = workingSet.map((item) => EID.make({ entityId: item.objectId }));
    return await this._runInRuntime(this._indexEngine.queryRelations({ endpoint, anchorDxns }));
  }

  private async _loadDocumentsAfterSqlQuery(metas: readonly EntityMeta[]): Promise<(QueryItem | null)[]> {
    const snapshotMap = await this._loadQueueSnapshotMap(metas);
    return await Promise.all(
      metas.map(async (meta) => {
        // Branch 1: Document-backed object.
        if (meta.documentId) {
          return this._loadFromAutomerge(meta);
        }

        // Branch 2: Queue-backed object.
        if (meta.queueId) {
          return this._loadFromQueue(meta, snapshotMap);
        }

        return null;
      }),
    );
  }

  private async _loadQueueSnapshotMap(metas: readonly EntityMeta[]): Promise<Map<number, unknown>> {
    const queueMetas = metas.filter((meta) => !meta.documentId && !!meta.queueId);
    if (queueMetas.length === 0) {
      return new Map();
    }

    const snapshots = await this._runInRuntime(
      this._indexEngine.querySnapshotsJSON(queueMetas.map((meta) => meta.recordId)),
    );
    return new Map(snapshots.map((s) => [s.recordId, s.snapshot]));
  }

  /**
   * Loads a queue-backed object from an indexed snapshot (by `recordId`).
   * Returns `null` when the snapshot is missing or is not a JSON object.
   */
  private _loadFromQueue(meta: EntityMeta, snapshotMap: Map<number, unknown>): QueryItem | null {
    const snapshot = snapshotMap.get(meta.recordId);
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }
    if (!EntityId.isValid(meta.queueId)) {
      return null;
    }

    return {
      objectId: meta.objectId,
      spaceId: meta.spaceId,
      queueId: meta.queueId,
      queueNamespace: meta.queueNamespace || null,
      documentId: null,
      doc: null,
      data: snapshot as Obj.JSON,
      rank: 1,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };
  }

  /**
   * Loads a document-backed object from an Automerge `DatabaseDirectory`.
   * Returns `null` if the document can't be loaded, the inline object isn't present, or if the meta does not have a
   * document id (e.g. queue-backed objects).
   */
  private async _loadFromAutomerge(meta: EntityMeta): Promise<QueryItem | null> {
    if (!meta.documentId) {
      return null;
    }
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, meta.documentId as DocumentId, {
      fetchFromNetwork: false,
    });
    if (!handle) {
      return null;
    }
    const object = DatabaseDirectory.getInlineObject(handle.doc(), meta.objectId);
    if (!object) {
      return null;
    }
    return {
      objectId: meta.objectId,
      documentId: meta.documentId as DocumentId,
      spaceId: meta.spaceId,
      queueId: null,
      queueNamespace: null,
      doc: object,
      data: null,
      rank: 1,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };
  }

  /**
   * Loads the target of an outgoing reference traversal.
   * Space-db objects load from Automerge; with `includeAllFeeds` scope, queue items resolve via the SQL index.
   */
  private async _loadReferencedTarget(
    dxn: URI.URI,
    { sourceSpaceId }: { sourceSpaceId: SpaceId },
  ): Promise<QueryItem | null> {
    const fromSpace = await this._loadFromDXN(dxn, { sourceSpaceId });
    if (fromSpace) {
      return fromSpace;
    }
    if (!this.#includeAllFeeds) {
      return null;
    }

    const parsedEchoUri = EID.tryParse(dxn);
    const objectId = parsedEchoUri ? EID.getEntityId(parsedEchoUri) : undefined;
    const spaceId = (parsedEchoUri ? EID.getSpaceId(parsedEchoUri) : undefined) ?? sourceSpaceId;
    if (!objectId || !spaceId) {
      return null;
    }

    const metas = await this._runInRuntime(
      this._indexEngine.queryObjectIds({ spaceIds: [spaceId], objectIds: [objectId] }),
    );
    if (metas.length === 0) {
      return null;
    }

    const [item] = await this._loadDocumentsAfterSqlQuery(metas);
    return item ?? null;
  }

  private async _loadFromDXN(dxn: URI.URI, { sourceSpaceId }: { sourceSpaceId: SpaceId }): Promise<QueryItem | null> {
    const echoUri = EID.tryParse(dxn);
    if (!echoUri) {
      log.warn('unable to resolve DXN', { dxn });
      return null;
    }

    const objectId = EID.getEntityId(echoUri);
    if (!objectId) {
      log.warn('unable to resolve DXN', { dxn });
      return null;
    }

    const spaceId = EID.getSpaceId(echoUri) ?? sourceSpaceId;

    const spaceRoot = this._spaceStateManager.getRootBySpaceId(spaceId);
    if (!spaceRoot) {
      log.warn('no space state found for', { spaceId });
      return null;
    }
    const dbDirectory = spaceRoot.doc();
    if (!dbDirectory) {
      log.warn('no space state found for', { spaceId });
      return null;
    }

    const inlineObject = DatabaseDirectory.getInlineObject(dbDirectory, objectId);
    if (inlineObject) {
      return {
        objectId,
        documentId: spaceRoot.documentId,
        spaceId,
        queueId: null,
        queueNamespace: null,
        data: null,
        doc: inlineObject,
        rank: 1,
        // DXN traversal results are not sourced from the meta index; timestamps are unavailable.
        createdAt: null,
        updatedAt: null,
      };
    }

    const link = DatabaseDirectory.getLink(dbDirectory, objectId);
    if (!link) {
      return null;
    }

    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(this._ctx, link as AutomergeUrl, {
      fetchFromNetwork: false,
    });
    if (!handle) {
      return null;
    }

    const object = DatabaseDirectory.getInlineObject(handle.doc(), objectId);
    if (!object) {
      return null;
    }

    return {
      objectId,
      documentId: handle.documentId,
      spaceId,
      queueId: null,
      queueNamespace: null,
      data: null,
      doc: object,
      rank: 1,
      // DXN traversal results are not sourced from the meta index; timestamps are unavailable.
      createdAt: null,
      updatedAt: null,
    };
  }

  /**
   * Loads a queue item by its object ID from the SQL index.
   * Used by the IdSelector path when querying within a queue scope.
   */
  private async _loadQueueItemById(spaceId: SpaceId, queueId: EntityId, objectId: EntityId): Promise<QueryItem | null> {
    const meta = await this._runInRuntime(this._indexEngine.lookupByObjectId({ objectId, spaceId, queueId }));
    if (!meta) {
      return null;
    }
    const snapshotMap = await this._loadQueueSnapshotMap([meta]);
    return this._loadFromQueue(meta, snapshotMap);
  }

  /**
   * Filters out items whose strong dependencies (schema object, relation endpoints,
   * parent) are not resolvable from local state — dangling references or docs that are
   * not on disk. Mirrors the client-side working-set filter so dep-broken objects are
   * excluded consistently on both sides of the query pipeline.
   */
  private async _filterUnresolvableStrongDeps(workingSet: QueryItem[]): Promise<QueryItem[]> {
    // Resolved dep verdicts shared across items (e.g. a common schema object).
    const verdicts = new Map<string, boolean>();
    const resolvable = await Promise.all(
      workingSet.map((item) =>
        this._areStrongDepsResolvable(item, MAX_DEPTH_FOR_STRONG_DEP_TRACING, verdicts, new Set()),
      ),
    );
    const result = workingSet.filter((_item, index) => resolvable[index]);
    if (result.length !== workingSet.length) {
      log('omitted items with unresolvable strong deps', {
        queryId: this._id,
        omitted: workingSet.filter((_item, index) => !resolvable[index]).map((item) => item.objectId),
      });
    }
    return result;
  }

  private async _areStrongDepsResolvable(
    item: QueryItem,
    remainingDepth: number,
    verdicts: Map<string, boolean>,
    seen: Set<string>,
  ): Promise<boolean> {
    if (remainingDepth <= 0) {
      // Depth cap reached — give the item the benefit of the doubt rather than excluding it.
      return true;
    }

    const results = await Promise.all(
      QueryItem.getStrongDependencies(item).map(async (dep) => {
        if (!EID.isLocal(dep)) {
          // Cross-space references are not gated (mirrors `ObjectCore.getStrongDependencies` usage).
          return true;
        }
        const key = compositeKey(item.spaceId, dep);
        const cached = verdicts.get(key);
        if (cached !== undefined) {
          return cached;
        }
        if (seen.has(key)) {
          // Reference cycle — treat as resolvable (mirrors the client's seen-set behavior).
          return true;
        }
        seen.add(key);

        const depItem = await this._loadFromDXN(dep, { sourceSpaceId: item.spaceId });
        const verdict =
          depItem != null && (await this._areStrongDepsResolvable(depItem, remainingDepth - 1, verdicts, seen));
        verdicts.set(key, verdict);
        return verdict;
      }),
    );
    return results.every(Boolean);
  }

  private async _getTransitiveDeletionState(item: QueryItem, remainingDepth: number): Promise<boolean> {
    const strongDeps = [
      QueryItem.getParent(item),
      QueryItem.getRelationSource(item),
      QueryItem.getRelationTarget(item),
    ].filter((x) => x !== undefined);

    if (strongDeps.length === 0) {
      return false;
    }

    // TODO(dmaretskyi): This could be optimized to bail early if any of the dependencies are deleted.
    const strongDepStates = await Promise.all(
      strongDeps.map(async (dxn) => {
        const dep = await this._loadFromDXN(dxn, { sourceSpaceId: item.spaceId });
        if (!dep) {
          return false;
        }
        if (QueryItem.isDeleted(dep)) {
          return true;
        }
        if (remainingDepth > 0) {
          return this._getTransitiveDeletionState(dep, remainingDepth - 1);
        }
        return false;
      }),
    );

    return strongDepStates.some((x) => x);
  }
}

const extractSpaceIdFromQueue = (feedUri: string): SpaceId | undefined => {
  const echoUri = EID.tryParse(feedUri);
  return echoUri ? EID.getSpaceId(echoUri) : undefined;
};

const extractQueueIds = (queues: readonly string[]): EntityId[] | null => {
  if (queues.length === 0) {
    return null;
  }
  return queues
    .map((feedUri) => {
      const echoUri = EID.tryParse(feedUri);
      return echoUri ? EID.getEntityId(echoUri) : undefined;
    })
    .filter((id): id is EntityId => id !== undefined);
};

/**
 * Extract timestamp parameters from a filter AST node.
 * Returns null if the filter doesn't contain timestamp nodes.
 */
const extractTimestampParams = (
  filter: QueryAST.Filter,
): { updatedAfter?: number; updatedBefore?: number; createdAfter?: number; createdBefore?: number } | null => {
  const collect = (f: QueryAST.Filter): QueryAST.FilterTimestamp[] => {
    if (f.type === 'timestamp') {
      return [f];
    }
    if (f.type === 'and') {
      return f.filters.flatMap(collect);
    }
    return [];
  };

  const timestamps = collect(filter);
  if (timestamps.length === 0) {
    return null;
  }

  const params: { updatedAfter?: number; updatedBefore?: number; createdAfter?: number; createdBefore?: number } = {};
  for (const ts of timestamps) {
    if (ts.field === 'updatedAt' && (ts.operator === 'gt' || ts.operator === 'gte')) {
      params.updatedAfter = ts.value;
    } else if (ts.field === 'updatedAt' && (ts.operator === 'lt' || ts.operator === 'lte')) {
      params.updatedBefore = ts.value;
    } else if (ts.field === 'createdAt' && (ts.operator === 'gt' || ts.operator === 'gte')) {
      params.createdAfter = ts.value;
    } else if (ts.field === 'createdAt' && (ts.operator === 'lt' || ts.operator === 'lte')) {
      params.createdBefore = ts.value;
    }
  }
  return params;
};

function filterContainsTimestamp(filter: QueryAST.Filter): boolean {
  if (filter.type === 'timestamp') {
    return true;
  }
  if (filter.type === 'and' || filter.type === 'or') {
    return filter.filters.some(filterContainsTimestamp);
  }
  if (filter.type === 'not') {
    return filterContainsTimestamp(filter.filter);
  }
  return false;
}
