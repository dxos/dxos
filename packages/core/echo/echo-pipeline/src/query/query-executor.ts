//
// Copyright 2025 DXOS.org
//

import type { AutomergeUrl, DocumentId } from '@dxos/automerge/automerge-repo';
import { Context, Resource } from '@dxos/context';
import { DatabaseDirectory, isEncodedReference, ObjectStructure, type QueryAST } from '@dxos/echo-protocol';
import { EscapedPropPath, type FindResult, type Indexer } from '@dxos/indexing';
import { DXN, type ObjectId, PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { objectPointerCodec } from '@dxos/protocols';
import { type QueryReactivity, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { getDeep, isNonNullable } from '@dxos/util';

import type { QueryPlan } from './plan';
import { QueryPlanner } from './query-planner';
import type { AutomergeHost } from '../automerge';
import { createIdFromSpaceKey } from '../common';
import type { SpaceStateManager } from '../db-host';
import { filterMatchObject } from '../filter';

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
    indexQueryTime: 0,
    documentLoadTime: 0,
    executionTime: 0,
    children: [],
  }),
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

  protected override async _open(ctx: Context) {}

  protected override async _close(ctx: Context) {}

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
    const prevResultSet = this._lastResultSet;

    const { workingSet, trace } = await this._execPlan(this._plan, this._lastResultSet);
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

    // log.info('Query execution result', {
    //   changed,
    //   trace: ExecutionTrace.format(trace),
    // });
    // eslint-disable-next-line no-console
    console.log(ExecutionTrace.format(trace));

    return {
      changed,
    };
  }

  private async _execPlan(plan: QueryPlan.Plan, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    const trace = ExecutionTrace.makeEmpty();
    for (const step of plan.steps) {
      const result = await this._execStep(step, workingSet);
      workingSet = result.workingSet;
      trace.children.push(result.trace);
    }
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
      case 'TraverseStep':
        ({ workingSet: newWorkingSet, trace } = await this._execTraverseStep(step, workingSet));
        break;
      default:
        throw new Error(`Unknown step type: ${(step as any)._tag}`);
    }
    trace.executionTime = performance.now() - begin;

    return { workingSet: newWorkingSet, trace };
  }

  private async _execSelectStep(step: QueryPlan.SelectStep, workingSet: QueryItem[]): Promise<StepExecutionResult> {
    workingSet = [...workingSet];

    const trace: ExecutionTrace = {
      ...ExecutionTrace.makeEmpty(),
      name: 'Select',
      details: JSON.stringify(step.selector),
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
        // For object id filters, we select nothing as those are handled by the SpaceQuerySource.
        // TODO(dmaretskyi): Implement this properly.
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
        // TODO(dmaretskyi): Implement this properly.
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
              .map((item) => {
                const ref = getDeep(item.doc.data, property);
                if (!isEncodedReference(ref)) {
                  return null;
                }

                try {
                  return {
                    ref: DXN.parse(ref['/']),
                    spaceId: item.spaceId,
                  };
                } catch {
                  log.warn('Invalid reference', { ref: ref['/'] });
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
                  log.warn('Invalid reference', { ref: ref['/'] });
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

  private async _loadDocumentsAfterIndexQuery(indexHits: FindResult[]): Promise<(QueryItem | null)[]> {
    return Promise.all(
      indexHits.map(async (hit): Promise<QueryItem | null> => {
        return this._loadFromIndexHit(hit);
      }),
    );
  }

  private async _loadFromIndexHit(hit: FindResult): Promise<QueryItem | null> {
    const { objectId, documentId, spaceKey: spaceKeyInIndex } = objectPointerCodec.decode(hit.id);

    const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(Context.default(), documentId as DocumentId);
    const doc = handle.docSync();
    if (!doc) {
      return null;
    }

    const spaceKey = spaceKeyInIndex ?? DatabaseDirectory.getSpaceKey(doc);
    if (!spaceKey) {
      return null;
    }

    const object = DatabaseDirectory.getInlineObject(doc, objectId);
    if (!object) {
      return null;
    }

    return {
      objectId,
      documentId: documentId as DocumentId,
      spaceId: await createIdFromSpaceKey(PublicKey.from(spaceKey)),
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
    const dbDirectory = spaceRoot.docSync();
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
    const doc = handle.docSync();
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
