import type { DocumentId } from '@dxos/automerge/automerge-repo';
import { Context, Resource } from '@dxos/context';
import { DatabaseDirectory, ObjectStructure, QueryAST } from '@dxos/echo-protocol';
import type { FindResult, Indexer } from '@dxos/indexing';
import { PublicKey, type ObjectId, type SpaceId } from '@dxos/keys';
import { type QueryReactivity, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import type { AutomergeHost } from '../automerge';
import type { QueryPlan } from './plan';
import { QueryPlanner } from './query-planner';
import { filterMatchObject } from './filter-match';
import { objectPointerCodec } from '@dxos/protocols';
import { raise } from '@dxos/debug';
import { createIdFromSpaceKey } from '../common';
import { isNonNullable } from '@dxos/util';

type QueryExecutorOptions = {
  indexer: Indexer;
  automergeHost: AutomergeHost;

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
type Item = {
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
  indexQueryTime: number;
  documentLoadTime: number;

  children: ExecutionTrace[];
};

const EMPTY_EXECUTION_TRACE: ExecutionTrace = {
  name: 'Empty',
  details: '',
  objectCount: 0,
  documentsLoaded: 0,
  indexQueryTime: 0,
  documentLoadTime: 0,
  children: [],
};

type StepExecutionResult = {
  workingSet: Item[];
  trace: ExecutionTrace;
};

export class QueryExecutor extends Resource {
  private readonly _indexer: Indexer;
  private readonly _automergeHost: AutomergeHost;

  private readonly _id: string;
  private readonly _query: QueryAST.Query;
  private readonly _reactivity: QueryReactivity;

  private _plan: QueryPlan.Plan;
  private _trace: ExecutionTrace = EMPTY_EXECUTION_TRACE;

  constructor(options: QueryExecutorOptions) {
    super();

    this._indexer = options.indexer;
    this._automergeHost = options.automergeHost;

    this._id = options.queryId;
    this._query = options.query;
    this._reactivity = options.reactivity;

    const queryPlanner = new QueryPlanner();
    this._plan = queryPlanner.createPlan(this._query);
  }

  protected override async _open(ctx: Context) {}

  protected override async _close(ctx: Context) {}

  getResults(): QueryResult[] {
    return [];
  }

  async execQuery(): Promise<QueryExecutionResult> {
    return {
      changed: false,
    };
  }

  private async _execPlan(plan: QueryPlan.Plan, workingSet: Item[]): Promise<StepExecutionResult> {
    const trace = EMPTY_EXECUTION_TRACE;
    for (const step of plan.steps) {
      const result = await this._execStep(step, workingSet);
      workingSet = result.workingSet;
      trace.children.push(result.trace);
    }
    return { workingSet, trace };
  }

  private async _execStep(step: QueryPlan.Step, workingSet: Item[]): Promise<StepExecutionResult> {
    if (this._ctx.disposed) {
      return { workingSet, trace: EMPTY_EXECUTION_TRACE };
    }

    switch (step._tag) {
      case 'ClearWorkingSetStep':
        return { workingSet: [], trace: EMPTY_EXECUTION_TRACE };
      case 'SelectStep':
        return this._execSelectStep(step, workingSet);
      case 'FilterStep':
        return this._execFilterStep(step, workingSet);
      case 'FilterDeletedStep':
        return this._execFilterDeletedStep(step, workingSet);
      case 'UnionStep':
        return this._execUnionStep(step, workingSet);
      case 'TraverseStep':
        return this._execTraverseStep(step, workingSet);
      default:
        throw new Error(`Unknown step type: ${(step as any)._tag}`);
    }
  }

  private async _execSelectStep(step: QueryPlan.SelectStep, workingSet: Item[]): Promise<StepExecutionResult> {
    workingSet = [...workingSet];

    const trace: ExecutionTrace = {
      ...EMPTY_EXECUTION_TRACE,
      name: 'Select',
      details: JSON.stringify(step.selector),
    };

    switch (step.selector._tag) {
      case 'EverythingSelector':
        // Return nothing and have the SpaceQuerySource handle it.
        // TODO(dmaretskyi): Implement this properly.
        break;
      case 'IdSelector':
        // For object id filters, we select nothing as those are handled by the SpaceQuerySource.
        // TODO(dmaretskyi): Implement this properly.
        break;
      case 'TypeSelector': {
        const beginIndexQuery = performance.now();
        const indexHits = await this._indexer.execQuery({
          typenames: step.selector.typename,
          inverted: step.selector.inverted,
        });
        trace.indexQueryTime += performance.now() - beginIndexQuery;

        if (this._ctx.disposed) {
          return { workingSet, trace };
        }

        const documentLoadStart = performance.now();
        const results = await this._loadDocumentsAfterIndexQuery(indexHits);
        trace.documentsLoaded += results.length;
        trace.documentLoadTime += performance.now() - documentLoadStart;

        workingSet.push(...results.filter(isNonNullable));
        trace.objectCount = workingSet.length;

        break;
      }
      case 'TextSearchSelector':
        // TODO(dmaretskyi): Implement this properly.
        break;
      default:
        throw new Error(`Unknown selector type: ${(step.selector as any)._tag}`);
    }

    return { workingSet, trace };
  }

  private async _execFilterStep(step: QueryPlan.FilterStep, workingSet: Item[]): Promise<StepExecutionResult> {
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
        ...EMPTY_EXECUTION_TRACE,
        name: 'Filter',
        details: JSON.stringify(step.filter),
        objectCount: result.length,
      },
    };
  }

  private async _execFilterDeletedStep(
    step: QueryPlan.FilterDeletedStep,
    workingSet: Item[],
  ): Promise<StepExecutionResult> {
    const expected = step.mode === 'only-deleted' ? true : false;
    const result = workingSet.filter((item) => ObjectStructure.isDeleted(item.doc) === expected);
    return {
      workingSet: result,
      trace: {
        ...EMPTY_EXECUTION_TRACE,
        name: 'FilterDeleted',
        details: step.mode,
        objectCount: result.length,
      },
    };
  }

  private async _execTraverseStep(step: QueryPlan.TraverseStep, workingSet: Item[]): Promise<StepExecutionResult> {
    const trace: ExecutionTrace = {
      ...EMPTY_EXECUTION_TRACE,
      name: 'Traverse',
      details: JSON.stringify(step.traversal),
    };

    const newWorkingSet: Item[] = [];

    throw new Error('Not implemented');
  }

  private async _execUnionStep(step: QueryPlan.UnionStep, workingSet: Item[]): Promise<StepExecutionResult> {
    const results = new Map<ObjectId, Item>();

    const resultSets = await Promise.all(step.plans.map((plan) => this._execPlan(plan, [...workingSet])));

    const trace: ExecutionTrace = {
      ...EMPTY_EXECUTION_TRACE,
      name: 'Union',
    };

    // NOTE: Doing insertion after execution to ensure deterministic results. Probably not needed.
    for (const resultSet of resultSets) {
      for (const item of resultSet.workingSet) {
        results.set(item.objectId, item);
      }
      trace.children.push(resultSet.trace);
    }

    return {
      workingSet: [...results.values()],
      trace,
    };
  }

  private async _loadDocumentsAfterIndexQuery(indexHits: FindResult[]): Promise<(Item | null)[]> {
    return Promise.all(
      indexHits.map(async (hit): Promise<Item | null> => {
        const { objectId, documentId, spaceKey: spaceKeyInIndex } = objectPointerCodec.decode(hit.id);

        const handle = await this._automergeHost.loadDoc<DatabaseDirectory>(
          Context.default(),
          documentId as DocumentId,
        );
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
      }),
    );
  }
}
