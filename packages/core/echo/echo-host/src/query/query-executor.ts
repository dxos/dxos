//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { LifecycleState, Resource } from '@dxos/context';
import { Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryReactivity } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type QueryService } from '@dxos/protocols/rpc';

import { type InvalidationHint, canonicalTypename } from '../db-host/invalidation-hint.ts';
import { QueryPlan } from './plan.ts';
import { QueryPlanner, filterContainsInQuery } from './query-planner.ts';
import { type CompiledRow, compilePlan } from './sql/index.ts';

type QueryExecutorOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;

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

  /** The compiled statement. */
  sql?: string;
  /** `EXPLAIN QUERY PLAN` of the compiled statement, when execution tracing is on. */
  explain?: string[];
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

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    DX_TRACE_QUERY_EXECUTION: string;
  }
}

const TRACE_QUERY_EXECUTION = !!import.meta.env?.DX_TRACE_QUERY_EXECUTION;

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
        // A nested in-query (subquery-membership) predicate's result depends on the subquery's
        // own scope/typenames — which may differ entirely from this query's — so a hint scoped
        // to this query's dimensions could miss a change that alters the subquery's result set.
        // `filterContainsInQuery` (not a bare `step.filter.type` check) is required: the residual
        // filter here is always `type: 'object'` with the in-query nested in `props`.
        if (filterContainsInQuery(step.filter)) {
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
 * Executes query plans by compiling them into one SQLite statement over the index tables.
 *
 * The QueryExecutor is responsible for:
 * - Compiling and running the query plan
 * - Holding the last result set and diffing it for change detection
 * - Tracking execution performance metrics
 * - Scoping the query so invalidation hints can skip it
 */
export class QueryExecutor extends Resource {
  private readonly _runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  /**
   * Id of this query.
   */
  private readonly _id: string;
  private readonly _query: QueryAST.Query;
  // TODO(dmaretskyi): Might be used in the future.
  private readonly _reactivity: QueryReactivity;

  private _plan: QueryPlan.Plan;
  #scopes: QueryScopes;
  private _trace: ExecutionTrace = ExecutionTrace.makeEmpty();
  private _lastResultSet: QueryService.QueryResult[] = [];

  constructor(options: QueryExecutorOptions) {
    super();

    this._runtime = options.runtime;

    this._id = options.queryId;
    this._query = options.query;
    this._reactivity = options.reactivity;

    const queryPlanner = new QueryPlanner();
    this._plan = queryPlanner.createPlan(this._query);
    this.#scopes = extractScopes(this._plan);
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

  getResults(): QueryService.QueryResult[] {
    return this._lastResultSet;
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
    const { results, trace } = await this.#execCompiled();
    this._lastResultSet = results;
    trace.name = 'Root';
    trace.details = JSON.stringify({ id: this._id, query: Query.pretty(Query.fromAst(this._query)) });
    this._trace = trace;

    const changed =
      prevResultSet.length !== results.length ||
      prevResultSet.some(
        (item, index) =>
          results[index].id !== item.id ||
          results[index].spaceId !== item.spaceId ||
          results[index].documentId !== item.documentId ||
          results[index].queueId !== item.queueId ||
          results[index].queueNamespace !== item.queueNamespace ||
          // A property edit can move an item between groups without changing its flat position
          // (e.g. the last item of group A becomes the first item of group B at the same index).
          results[index].groupKey !== item.groupKey,
      );

    if (TRACE_QUERY_EXECUTION) {
      // eslint-disable-next-line no-console
      console.log(ExecutionTrace.format(trace));
      if (trace.sql) {
        // eslint-disable-next-line no-console
        console.log(trace.sql, trace.explain);
      }
    }

    return {
      changed,
    };
  }

  /**
   * One statement over the index tables, no document loads. Document rows ship identity only,
   * since the client hydrates them from the document itself; feed rows carry the indexed body.
   */
  async #execCompiled(): Promise<{ results: QueryService.QueryResult[]; trace: ExecutionTrace }> {
    const trace: ExecutionTrace = { ...ExecutionTrace.makeEmpty(), beginTs: performance.now() };
    const plan = this._plan;
    const { rows, sql, explain } = await this._runInRuntime(
      Effect.gen(function* () {
        const compiled = yield* compilePlan(plan);
        const rows = yield* compiled.statement;
        const explain = TRACE_QUERY_EXECUTION
          ? (yield* (yield* SqlClient.SqlClient).unsafe<{ detail: string }>(
              `EXPLAIN QUERY PLAN ${compiled.sql}`,
              compiled.statement.compile()[1],
            )).map((row) => row.detail)
          : undefined;
        return { rows, sql: compiled.sql, explain };
      }),
    );
    trace.indexQueryTime = performance.now() - trace.beginTs;
    trace.indexHits = rows.length;
    trace.objectCount = rows.length;
    trace.sql = sql;
    trace.explain = explain;
    ExecutionTrace.markEnd(trace);
    return { results: rows.map(compiledRowToResult), trace };
  }

  private async _runInRuntime<T>(effect: Effect.Effect<T, unknown, SqlClient.SqlClient>): Promise<T> {
    const runtimeProvider = this._runtime;
    invariant(runtimeProvider, 'SQL runtime is required.');
    return await RuntimeProvider.runPromise(runtimeProvider)(effect);
  }
}

const compiledRowToResult = (row: CompiledRow): QueryService.QueryResult => ({
  id: row.objectId,
  spaceId: row.spaceId,
  documentId: row.documentId !== '' ? row.documentId : undefined,
  queueId: row.queueId !== '' ? row.queueId : undefined,
  queueNamespace: row.queueNamespace !== '' ? row.queueNamespace : undefined,
  rank: row.rank,
  documentJson: row.documentJson ?? undefined,
  groupKey: row.groupKey ?? undefined,
  groupCount: row.groupCount ?? undefined,
});
