//
// Copyright 2025 DXOS.org
//

import type { AutomergeUrl, DocumentId } from '@automerge/automerge-repo';
import type * as SqlClient from '@effect/sql/SqlClient';
import type * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';

import { Context, ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import type { Obj } from '@dxos/echo';
import { ATTR_PARENT, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET } from '@dxos/echo/internal';
import {
  DatabaseDirectory,
  EncodedReference,
  type ObjectPropPath,
  ObjectStructure,
  type QueryAST,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { type RuntimeProvider, runAndForwardErrors, unwrapExit } from '@dxos/effect';
import { EscapedPropPath, type IndexEngine, type ObjectMeta, type ReverseRef } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { DXN, type ObjectId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryReactivity, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { getDeep, isNonNullable } from '@dxos/util';

import type { AutomergeHost } from '../automerge';
import type { SpaceStateManager } from '../db-host';
import { filterMatchObject, filterMatchObjectJSON } from '../filter';

import type { QueryPlan } from './plan';
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
  objectId: ObjectId;

  spaceId: SpaceId;
  queueId: ObjectId | null;
  queueNamespace: string | null;

  // For objects from automerge documents.
  documentId: DocumentId | null;

  // For objects from automerge documents.
  doc: ObjectStructure | null;

  // For objects from queues.
  data: Obj.JSON | null;

  /**
   * Relevance rank for this item.
   * Higher values indicate better matches for FTS/vector searches.
   * Defaults to 1 for non-ranked queries (predicate matches).
   */
  rank: number;
};

const QueryItem = Object.freeze({
  /**
   * Checks if the item is deleted.
   * Only applies to this item, not its parents.
   */
  isDeleted: (item: QueryItem) => {
    if (item.doc) {
      return ObjectStructure.isDeleted(item.doc);
    } else if (item.data) {
      return item.data['@deleted'] === true;
    } else {
      throw new Error('Invalid query item');
    }
  },

  getProperty: (item: QueryItem, property: ObjectPropPath) => {
    if (item.doc) {
      return getDeep(item.doc.data, property);
    } else if (item.data) {
      return getDeep(item.data, property);
    } else {
      throw new Error('Invalid query item');
    }
  },

  getParent: (item: QueryItem): DXN.String | undefined => {
    if (item.doc) {
      return ObjectStructure.getParent(item.doc)?.['/'] as DXN.String | undefined;
    } else if (item.data) {
      return item.data[ATTR_PARENT] as DXN.String;
    } else {
      throw new Error('Invalid query item');
    }
  },

  getRelationSource: (item: QueryItem): DXN.String | undefined => {
    if (item.doc) {
      return ObjectStructure.getRelationSource(item.doc)?.['/'] as DXN.String | undefined;
    } else if (item.data) {
      return item.data[ATTR_RELATION_SOURCE] as DXN.String;
    } else {
      throw new Error('Invalid query item');
    }
  },

  getRelationTarget: (item: QueryItem): DXN.String | undefined => {
    if (item.doc) {
      return ObjectStructure.getRelationTarget(item.doc)?.['/'] as DXN.String | undefined;
    } else if (item.data) {
      return item.data[ATTR_RELATION_TARGET] as DXN.String;
    } else {
      throw new Error('Invalid query item');
    }
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
    env: {
      DX_TRACE_QUERY_EXECUTION: string;
    };
  }
}

const TRACE_QUERY_EXECUTION = !!import.meta.env.DX_TRACE_QUERY_EXECUTION;

const MAX_DEPTH_FOR_DELETION_TRACING = 10;

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
    return this._lastResultSet.map(
      (item): QueryResult => ({
        id: item.objectId,
        documentId: item.documentId ?? undefined,
        queueId: item.queueId ?? undefined,
        queueNamespace: item.queueNamespace ?? undefined,
        spaceId: item.spaceId,

        rank: item.rank,

        documentJson: item.doc ? JSON.stringify(item.doc) : item.data ? JSON.stringify(item.data) : undefined,
      }),
    );
  }

  async execQuery(): Promise<QueryExecutionResult> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const prevResultSet = this._lastResultSet;
    const { workingSet, trace } = await this._execPlan(this._plan, []);
    this._lastResultSet = workingSet;
    trace.name = 'Root';
    trace.details = JSON.stringify({ id: this._id, query: prettyQuery(this._query) });
    this._trace = trace;

    const changed =
      prevResultSet.length !== workingSet.length ||
      prevResultSet.some(
        (item, index) =>
          workingSet[index].objectId !== item.objectId ||
          workingSet[index].spaceId !== item.spaceId ||
          workingSet[index].documentId !== item.documentId,
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
      default:
        throw new Error(`Unknown step type: ${(step as any)._tag}`);
    }
    trace.beginTs = begin;
    ExecutionTrace.markEnd(trace);

    return { workingSet: newWorkingSet, trace };
  }

  private async _execSelectStep(step: QueryPlan.SelectStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    workingSet = [...workingSet];

    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'Select',
      details: JSON.stringify(step.selector),
      beginTs: performance.now(),
    };

    switch (step.selector._tag) {
      case 'WildcardSelector': {
        const beginIndexQuery = performance.now();
        const queueIds = extractQueueIds(step.queues);
        const metas = await this._queryAllFromSqlIndex(step.spaces, step.allQueuesFromSpaces, queueIds);
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

        const items = await Promise.all(
          step.selector.objectIds.map((id) => {
            if (step.queues.length > 0) {
              const { spaceId } = DXN.parse(step.queues[0]).asQueueDXN()!;
              return this._loadFromDXN(DXN.parse(step.queues[0]).extend([id]), { sourceSpaceId: spaceId });
            } else if (step.spaces.length > 0) {
              return this._loadFromDXN(DXN.fromLocalObjectId(id), { sourceSpaceId: step.spaces[0] });
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
        const queueIds = extractQueueIds(step.queues);
        const metas = await this._queryTypesFromSqlIndex(
          step.spaces,
          step.selector.typename,
          step.selector.inverted,
          step.allQueuesFromSpaces,
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
        invariant(step.spaces.length <= 1, 'Multiple spaces are not supported for full-text search');
        const queueIds = extractQueueIds(step.queues);
        const textResults = await this._runInRuntime(
          this._indexEngine.queryText({
            query: step.selector.text,
            spaceId: step.spaces,
            includeAllQueues: step.allQueuesFromSpaces,
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
              return {
                objectId: result.objectId as ObjectId,
                spaceId: result.spaceId as SpaceId,
                queueId: result.queueId as ObjectId,
                queueNamespace: 'data',
                documentId: null,
                doc: null,
                data: snapshot as Obj.JSON,
                rank: rankMap.get(result.recordId) ?? 1,
              };
            })
            .filter(isNonNullable);
        }

        // Load space items from documents.
        const spaceItems = await Promise.all(
          spaceResults.map(async (result): Promise<QueryItem | null> => {
            const dxn = DXN.fromLocalObjectId(result.objectId);
            const item = await this._loadFromDXN(dxn, { sourceSpaceId: result.spaceId as SpaceId });
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
            if (step.spaces.includes(item.spaceId)) {
              return true;
            }
            if (item.queueId) {
              return step.queues.some((dxn) => {
                const { queueId, spaceId } = DXN.parse(dxn).asQueueDXN()!;
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
    const result = workingSet.filter((item) => {
      if (item.doc) {
        return filterMatchObject(step.filter, {
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
                          ref: DXN.parse(ref['/']),
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
              refs.map(({ ref, spaceId }) => this._loadFromDXN(ref, { sourceSpaceId: spaceId })),
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
                try {
                  return {
                    ref: DXN.parse(dxn),
                    spaceId: item.spaceId,
                  };
                } catch {
                  log.warn('invalid reference', { ref: dxn });
                  return null;
                }
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
                const ref = ObjectStructure.getParent(item.doc);
                if (!EncodedReference.isEncodedReference(ref)) {
                  return null;
                }
                try {
                  return {
                    ref: DXN.parse(ref['/']),
                    spaceId: item.spaceId,
                  };
                } catch {
                  log.warn('invalid parent reference', { ref: ref['/'] });
                  return null;
                }
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
            // Group working set by spaceId.
            const bySpace = new Map<SpaceId, ObjectId[]>();
            for (const item of workingSet) {
              const existing = bySpace.get(item.spaceId);
              if (existing) {
                existing.push(item.objectId);
              } else {
                bySpace.set(item.spaceId, [item.objectId]);
              }
            }

            // Query children for each space.
            const allChildren: { spaceId: SpaceId; objectId: ObjectId }[] = [];
            for (const [spaceId, parentIds] of bySpace) {
              const children = await this._runInRuntime(
                this._indexEngine.queryChildren({ spaceId: [spaceId], parentIds }),
              );

              for (const child of children) {
                allChildren.push({ spaceId, objectId: child.objectId as ObjectId });
              }
            }

            trace.indexHits += allChildren.length;

            const documentLoadStart = performance.now();
            const results = await Promise.all(
              allChildren.map(({ spaceId, objectId }) =>
                this._loadFromDXN(DXN.fromLocalObjectId(objectId), { sourceSpaceId: spaceId }),
              ),
            );
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
    const results = new Map<ObjectId, QueryItem>();

    const resultSets = await Promise.all(step.plans.map((plan) => this._execPlan(plan, [...workingSet])));

    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'Union',
    };

    // NOTE: Doing insertion after execution to ensure deterministic results. Probably not needed.
    for (const resultSet of resultSets) {
      for (const item of resultSet.workingSet) {
        // Could be duplicate object ids in different spaces or in different epochs of the same space.
        results.set(`${item.spaceId}:${item.documentId}:${item.objectId}`, item);
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
    let sortedWorkingSet = [...workingSet].sort((a, b) => this._compareMultiOrder(a, b, step.order));

    // Apply limit if specified on the order step.
    if (step.limit !== undefined && sortedWorkingSet.length > step.limit) {
      sortedWorkingSet = sortedWorkingSet.slice(0, step.limit);
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
    const limitedWorkingSet = workingSet.slice(0, step.limit);

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
      case 'natural':
        return a.objectId.localeCompare(b.objectId);
      case 'property': {
        const comparison = this._compareByProperty(a, b, order.property);
        return order.direction === 'desc' ? -comparison : comparison;
      }
      case 'rank': {
        // Higher rank = better match. By default, descending order (best first).
        const comparison = a.rank - b.rank;
        return order.direction === 'desc' ? -comparison : comparison;
      }
      default:
        // Should never reach here with proper TypeScript types.
        return 0;
    }
  }

  private _compareByProperty(a: QueryItem, b: QueryItem, property: string): number {
    const aValue = QueryItem.getProperty(a, [property]);
    const bValue = QueryItem.getProperty(b, [property]);

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
    const runtime = await runAndForwardErrors(runtimeProvider);
    return await unwrapExit(await effect.pipe(Runtime.runPromiseExit(runtime)));
  }

  private async _queryAllFromSqlIndex(
    spaceIds: readonly SpaceId[],
    includeAllQueues: boolean,
    queueIds: readonly ObjectId[] | null,
  ): Promise<readonly ObjectMeta[]> {
    return await this._runInRuntime(this._indexEngine.queryAll({ spaceIds, includeAllQueues, queueIds }));
  }

  private async _queryTypesFromSqlIndex(
    spaceIds: readonly SpaceId[],
    typeDxns: readonly string[],
    inverted: boolean,
    includeAllQueues: boolean,
    queueIds: readonly ObjectId[] | null,
  ): Promise<readonly ObjectMeta[]> {
    return await this._runInRuntime(
      this._indexEngine.queryTypes({ spaceIds, typeDxns, inverted, includeAllQueues, queueIds }),
    );
  }

  private async _queryIncomingReferencesFromSqlIndex(
    workingSet: QueryItem[],
    property: EscapedPropPath | null,
  ): Promise<readonly ObjectMeta[]> {
    const anchorDxns = workingSet.map((item) => DXN.fromLocalObjectId(item.objectId).toString());
    const rows: readonly ReverseRef[] = (
      await Promise.all(
        anchorDxns.map((targetDxn) => this._runInRuntime(this._indexEngine.queryReverseRef({ targetDxn }))),
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
  ): Promise<readonly ObjectMeta[]> {
    const anchorDxns = workingSet.map((item) => DXN.fromLocalObjectId(item.objectId).toString());
    return await this._runInRuntime(this._indexEngine.queryRelations({ endpoint, anchorDxns }));
  }

  private async _loadDocumentsAfterSqlQuery(metas: readonly ObjectMeta[]): Promise<(QueryItem | null)[]> {
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

  private async _loadQueueSnapshotMap(metas: readonly ObjectMeta[]): Promise<Map<number, unknown>> {
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
  private _loadFromQueue(meta: ObjectMeta, snapshotMap: Map<number, unknown>): QueryItem | null {
    const snapshot = snapshotMap.get(meta.recordId);
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    return {
      objectId: meta.objectId as ObjectId,
      spaceId: meta.spaceId as SpaceId,
      queueId: meta.queueId as ObjectId,
      queueNamespace: 'data',
      documentId: null,
      doc: null,
      data: snapshot as Obj.JSON,
      rank: 1,
    };
  }

  /**
   * Loads a document-backed object from an Automerge `DatabaseDirectory`.
   * Returns `null` if the document can't be loaded, the inline object isn't present, or if the meta does not have a
   * document id (e.g. queue-backed objects).
   */
  private async _loadFromAutomerge(meta: ObjectMeta): Promise<QueryItem | null> {
    if (!meta.documentId) {
      return null;
    }
    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(
      Context.default(),
      meta.documentId as DocumentId,
      {
        fetchFromNetwork: true,
      },
    );
    const doc = handle.doc();
    if (!doc) {
      return null;
    }
    const object = DatabaseDirectory.getInlineObject(doc, meta.objectId);
    if (!object) {
      return null;
    }
    return {
      objectId: meta.objectId,
      documentId: meta.documentId as DocumentId,
      spaceId: meta.spaceId as SpaceId,
      queueId: null,
      queueNamespace: null,
      doc: object,
      data: null,
      rank: 1,
    };
  }

  private async _loadFromDXN(dxn: DXN, { sourceSpaceId }: { sourceSpaceId: SpaceId }): Promise<QueryItem | null> {
    switch (dxn.kind) {
      case DXN.kind.ECHO: {
        const echoDxn = dxn.asEchoDXN();
        if (!echoDxn) {
          log.warn('unable to resolve DXN', { dxn });
          return null;
        }

        const spaceId = echoDxn.spaceId ?? sourceSpaceId;

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

        const inlineObject = DatabaseDirectory.getInlineObject(dbDirectory, echoDxn.echoId);
        if (inlineObject) {
          return {
            objectId: echoDxn.echoId,
            documentId: spaceRoot.documentId,
            spaceId,
            queueId: null,
            queueNamespace: null,
            data: null,
            doc: inlineObject,
            rank: 1,
          };
        }

        const link = DatabaseDirectory.getLink(dbDirectory, echoDxn.echoId);
        if (!link) {
          return null;
        }

        const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(Context.default(), link as AutomergeUrl, {
          fetchFromNetwork: true,
        });
        const doc = handle.doc();
        if (!doc) {
          return null;
        }

        const object = DatabaseDirectory.getInlineObject(doc, echoDxn.echoId);
        if (!object) {
          return null;
        }

        return {
          objectId: echoDxn.echoId,
          documentId: handle.documentId,
          spaceId,
          queueId: null,
          queueNamespace: null,
          data: null,
          doc: object,
          rank: 1,
        };
        break;
      }
      case DXN.kind.QUEUE: {
        const queueDxn = dxn.asQueueDXN();
        if (!queueDxn || !queueDxn.objectId) {
          log.warn('unable to resolve queue DXN', { dxn });
          return null;
        }

        const { spaceId, queueId, objectId } = queueDxn;
        const meta = await this._runInRuntime(
          this._indexEngine.lookupByObjectId({
            objectId,
            spaceId,
            queueId,
          }),
        );
        if (!meta) {
          return null;
        }

        const snapshotMap = await this._loadQueueSnapshotMap([meta]);
        return this._loadFromQueue(meta, snapshotMap);
      }
      default: {
        log.warn('unable to resolve DXN', { dxn });
        return null;
      }
    }
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
        const dep = await this._loadFromDXN(DXN.parse(dxn), { sourceSpaceId: item.spaceId });
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

const prettyFilter = (filter: QueryAST.Filter): string => {
  switch (filter.type) {
    case 'object': {
      const parts: string[] = [];
      if (filter.typename !== null) {
        parts.push(String(filter.typename));
      }
      if (filter.id !== undefined && filter.id.length > 0) {
        parts.push(`id: [${filter.id.join(', ')}]`);
      }
      const propEntries = Object.entries(filter.props);
      if (propEntries.length > 0) {
        const propsStr = propEntries.map(([k, v]) => `${k}: ${prettyFilter(v)}`).join(', ');
        parts.push(`{ ${propsStr} }`);
      }
      if (filter.foreignKeys !== undefined && filter.foreignKeys.length > 0) {
        parts.push(`foreignKeys: [${filter.foreignKeys.map((fk) => JSON.stringify(fk)).join(', ')}]`);
      }
      return parts.length > 0 ? `Filter.type(${parts.join(', ')})` : 'Filter.everything()';
    }
    case 'compare':
      return `Filter.${filter.operator}(${JSON.stringify(filter.value)})`;
    case 'in':
      return `Filter.in([${filter.values.map((v) => JSON.stringify(v)).join(', ')}])`;
    case 'contains':
      return `Filter.contains(${JSON.stringify(filter.value)})`;
    case 'tag':
      return `Filter.tag(${JSON.stringify(filter.tag)})`;
    case 'range':
      return `Filter.range(${JSON.stringify(filter.from)}, ${JSON.stringify(filter.to)})`;
    case 'text-search':
      return filter.searchKind
        ? `Filter.textSearch(${JSON.stringify(filter.text)}, ${JSON.stringify(filter.searchKind)})`
        : `Filter.textSearch(${JSON.stringify(filter.text)})`;
    case 'not':
      return `Filter.not(${prettyFilter(filter.filter)})`;
    case 'and':
      return `Filter.and(${filter.filters.map(prettyFilter).join(', ')})`;
    case 'or':
      return `Filter.or(${filter.filters.map(prettyFilter).join(', ')})`;
  }
};

const prettyQuery = (query: QueryAST.Query): string => {
  switch (query.type) {
    case 'select':
      return `Query.select(${prettyFilter(query.filter)})`;
    case 'filter':
      return `${prettyQuery(query.selection)}.select(${prettyFilter(query.filter)})`;
    case 'reference-traversal':
      return `${prettyQuery(query.anchor)}.reference(${JSON.stringify(query.property)})`;
    case 'incoming-references': {
      const args: string[] = [];
      if (query.typename !== null) {
        args.push(String(query.typename));
      }
      if (query.property !== null) {
        args.push(JSON.stringify(query.property));
      }
      return `${prettyQuery(query.anchor)}.referencedBy(${args.join(', ')})`;
    }
    case 'relation': {
      const method =
        query.direction === 'outgoing' ? 'sourceOf' : query.direction === 'incoming' ? 'targetOf' : 'relationOf';
      const filterStr = query.filter !== undefined ? prettyFilter(query.filter) : '';
      return `${prettyQuery(query.anchor)}.${method}(${filterStr})`;
    }
    case 'relation-traversal':
      return `${prettyQuery(query.anchor)}.${query.direction}()`;
    case 'hierarchy-traversal':
      return query.direction === 'to-parent'
        ? `${prettyQuery(query.anchor)}.parent()`
        : `${prettyQuery(query.anchor)}.children()`;
    case 'union':
      return `Query.all(${query.queries.map(prettyQuery).join(', ')})`;
    case 'set-difference':
      return `Query.without(${prettyQuery(query.source)}, ${prettyQuery(query.exclude)})`;
    case 'order': {
      const orders = query.order.map((o) => {
        if (o.kind === 'natural') {
          return 'Order.natural()';
        } else if (o.kind === 'rank') {
          return `Order.rank(${JSON.stringify(o.direction)})`;
        } else {
          return `Order.property(${JSON.stringify(o.property)}, ${JSON.stringify(o.direction)})`;
        }
      });
      return `${prettyQuery(query.query)}.orderBy(${orders.join(', ')})`;
    }
    case 'options': {
      const opts = query.options;
      const parts: string[] = [];
      if (opts.spaceIds !== undefined) {
        parts.push(`spaceIds: [${opts.spaceIds.map((s) => JSON.stringify(s)).join(', ')}]`);
      }
      if (opts.queues !== undefined) {
        parts.push(`queues: [${opts.queues.map(String).join(', ')}]`);
      }
      if (opts.deleted !== undefined) {
        parts.push(`deleted: ${JSON.stringify(opts.deleted)}`);
      }
      if (opts.allQueuesFromSpaces !== undefined) {
        parts.push(`allQueuesFromSpaces: ${opts.allQueuesFromSpaces}`);
      }
      return `${prettyQuery(query.query)}.options({ ${parts.join(', ')} })`;
    }
    case 'limit':
      return `${prettyQuery(query.query)}.limit(${query.limit})`;
  }
};

const extractQueueIds = (queues: readonly DXN.String[]): ObjectId[] | null => {
  if (queues.length === 0) {
    return null;
  }
  return queues.map((dxnStr) => DXN.parse(dxnStr).asQueueDXN()?.queueId).filter(Boolean) as ObjectId[];
};
