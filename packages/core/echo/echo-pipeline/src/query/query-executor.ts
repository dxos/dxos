//
// Copyright 2025 DXOS.org
//

import type { AutomergeUrl, DocumentId } from '@automerge/automerge-repo';
import * as Match from 'effect/Match';
import * as Predicate from 'effect/Predicate';

import { Context, ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
import { DatabaseDirectory, ObjectStructure, type QueryAST, isEncodedReference } from '@dxos/echo-protocol';
import { EscapedPropPath, type FindResult, type Indexer } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { DXN, type ObjectId, PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { objectPointerCodec } from '@dxos/protocols';
import { type QueryReactivity, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { getDeep, isNonNullable } from '@dxos/util';

import type { AutomergeHost } from '../automerge';
import { createIdFromSpaceKey } from '../common';
import type { SpaceStateManager } from '../db-host';
import { filterMatchObject } from '../filter';

import type { QueryPlan } from './plan';
import { QueryPlanner } from './query-planner';

const isNullable: Predicate.Refinement<unknown, null | undefined> = Predicate.isNullable;

type QueryExecutorOptions = {
  indexer: Indexer;
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
  documentId: DocumentId;
  spaceId: SpaceId;
  doc: ObjectStructure;
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

const TRACE_QUERY_EXECUTION = false;

/**
 * Executes query plans against the Indexer and AutomergeHost.
 *
 * The QueryExecutor is responsible for:
 * - Executing query plans step by step
 * - Managing the working set of query results
 * - Loading documents from the database
 * - Tracking execution performance metrics
 * - Handling different types of query operations (select, filter, traverse, etc.)
 */
export class QueryExecutor extends Resource {
  private readonly _indexer: Indexer;
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

    this._indexer = options.indexer;
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

  protected override async _open(ctx: Context): Promise<void> {}

  protected override async _close(ctx: Context): Promise<void> {}

  getResults(): QueryResult[] {
    return this._lastResultSet.map(
      (item): QueryResult => ({
        id: item.objectId,
        documentId: item.documentId,
        spaceId: item.spaceId,

        // TODO(dmaretskyi): Plumb through the rank.
        rank: 0,
      }),
    );
  }

  async execQuery(): Promise<QueryExecutionResult> {
    invariant(this._lifecycleState === LifecycleState.OPEN);

    const prevResultSet = this._lastResultSet;
    const { workingSet, trace } = await this._execPlan(this._plan, []);
    this._lastResultSet = workingSet;
    trace.name = 'Root';
    trace.details = JSON.stringify({ id: this._id });
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
      console.log(ExecutionTrace.format(trace));
    }

    return {
      changed,
    };
  }

  private async _execPlan(plan: QueryPlan.Plan, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const trace = ExecutionTrace.makeEmpty();
    const begin = performance.now();
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
        const indexHits = await this._indexer.execQuery({
          typenames: [],
          inverted: false,
        });
        trace.indexHits = +indexHits.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterIndexQuery(indexHits);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable).filter((item) => step.spaces.includes(item.spaceId)));
        trace.objectCount = workingSet.length;

        break;
      }

      case 'IdSelector': {
        const beginLoad = performance.now();
        const items = await Promise.all(
          step.selector.objectIds.map((id) =>
            this._loadFromDXN(DXN.fromLocalObjectId(id), { sourceSpaceId: step.spaces[0] }),
          ),
        );
        trace.documentLoadTime += performance.now() - beginLoad;

        workingSet.push(...items.filter(isNonNullable));
        trace.objectCount = workingSet.length;
        break;
      }

      case 'TypeSelector': {
        const beginIndexQuery = performance.now();
        const indexHits = await this._indexer.execQuery({
          typenames: step.selector.typename,
          inverted: step.selector.inverted,
        });
        trace.indexHits = +indexHits.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterIndexQuery(indexHits);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable).filter((item) => step.spaces.includes(item.spaceId)));
        trace.objectCount = workingSet.length;

        break;
      }

      case 'TextSelector': {
        const beginIndexQuery = performance.now();
        const indexHits = await this._indexer.execQuery({
          typenames: [],
          text: {
            query: step.selector.text,
            kind: Match.type<QueryPlan.TextSearchKind>().pipe(
              Match.withReturnType<'text' | 'vector'>(),
              Match.when('full-text', () => 'text'),
              Match.when('vector', () => 'vector'),
              Match.orElseAbsurd,
            )(step.selector.searchKind),
          },
        });
        trace.indexHits = +indexHits.length;
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterIndexQuery(indexHits);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable).filter((item) => step.spaces.includes(item.spaceId)));
        trace.objectCount = workingSet.length;
        break;
      }

      default:
        throw new Error(`Unknown selector type: ${(step.selector as any)._tag}`);
    }

    return { workingSet, trace };
  }

  private async _execFilterStep(step: QueryPlan.FilterStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const result = workingSet.filter((item) =>
      filterMatchObject(step.filter, {
        id: item.objectId,
        spaceId: item.spaceId,
        doc: item.doc,
      }),
    );

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
    const result = workingSet.filter((item) => ObjectStructure.isDeleted(item.doc) === expected);
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
            const property = EscapedPropPath.unescape(step.traversal.property);

            const refs = workingSet
              .flatMap((item) => {
                const ref = getDeep(item.doc.data, property);
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
            const indexHits = await this._indexer.execQuery({
              typenames: [],
              inverted: false,
              graph: {
                kind: 'inbound-reference',
                property: step.traversal.property,
                anchors: workingSet.map((item) => item.objectId),
              },
            });
            trace.indexHits += indexHits.length;

            const documentLoadStart = performance.now();
            const results = await this._loadDocumentsAfterIndexQuery(indexHits);
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
                const ref =
                  step.traversal.direction === 'relation-to-source'
                    ? ObjectStructure.getRelationSource(item.doc)
                    : ObjectStructure.getRelationTarget(item.doc);

                if (!isEncodedReference(ref)) {
                  return null;
                }
                try {
                  return {
                    ref: DXN.parse(ref['/']),
                    spaceId: item.spaceId,
                  };
                } catch {
                  log.warn('invalid reference', { ref: ref['/'] });
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
            const indexHits = await this._indexer.execQuery({
              typenames: [],
              inverted: false,
              graph: {
                kind: step.traversal.direction === 'source-to-relation' ? 'relation-source' : 'relation-target',
                anchors: workingSet.map((item) => item.objectId),
                property: null,
              },
            });

            trace.indexHits += indexHits.length;

            const documentLoadStart = performance.now();
            const results = await this._loadDocumentsAfterIndexQuery(indexHits);
            trace.documentsLoaded += results.length;
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
    const sortedWorkingSet = [...workingSet].sort((a, b) => this._compareMultiOrder(a, b, step.order));

    return {
      workingSet: sortedWorkingSet,
      trace: {
        ...ExecutionTrace.makeEmpty(),
        name: 'Order',
        details: JSON.stringify(step.order),
        objectCount: sortedWorkingSet.length,
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
      default:
        // Should never reach here with proper TypeScript types
        return 0;
    }
  }

  private _compareByProperty(a: QueryItem, b: QueryItem, property: string): number {
    const aValue = a.doc.data[property];
    const bValue = b.doc.data[property];

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

  private async _loadDocumentsAfterIndexQuery(indexHits: FindResult[]): Promise<(QueryItem | null)[]> {
    return Promise.all(
      indexHits.map(async (hit): Promise<QueryItem | null> => {
        return this._loadFromIndexHit(hit);
      }),
    );
  }

  /**
   * Space key hex -> SpaceId.
   */
  private readonly _spaceIdCache = new Map<string, SpaceId>();

  private async _loadFromIndexHit(hit: FindResult): Promise<QueryItem | null> {
    const { objectId, documentId, spaceKey: spaceKeyInIndex } = objectPointerCodec.decode(hit.id);

    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(Context.default(), documentId as DocumentId);
    const doc = handle.doc();
    if (!doc) {
      return null;
    }

    const spaceKey = spaceKeyInIndex ?? DatabaseDirectory.getSpaceKey(doc);
    if (!spaceKey) {
      return null;
    }

    let spaceId = this._spaceIdCache.get(spaceKey);
    if (!spaceId) {
      spaceId = await createIdFromSpaceKey(PublicKey.from(spaceKey));
      this._spaceIdCache.set(spaceKey, spaceId);
    }

    const object = DatabaseDirectory.getInlineObject(doc, objectId);
    if (!object) {
      return null;
    }

    return {
      objectId,
      documentId: documentId as DocumentId,
      spaceId,
      doc: object,
    };
  }

  private async _loadFromDXN(dxn: DXN, { sourceSpaceId }: { sourceSpaceId: SpaceId }): Promise<QueryItem | null> {
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
        doc: inlineObject,
      };
    }

    const link = DatabaseDirectory.getLink(dbDirectory, echoDxn.echoId);
    if (!link) {
      return null;
    }

    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(Context.default(), link as AutomergeUrl);
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
      doc: object,
    };
  }
}
