import type { DocumentId } from '@dxos/automerge/automerge-repo';
import { Resource, type Context } from '@dxos/context';
import { ObjectStructure, QueryAST } from '@dxos/echo-protocol';
import type { Indexer } from '@dxos/indexing';
import type { ObjectId, SpaceId } from '@dxos/keys';
import { type QueryReactivity, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import type { AutomergeHost } from '../automerge';
import type { QueryPlan } from './plan';
import { QueryPlanner } from './query-planner';

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

export class QueryExecutor extends Resource {
  private readonly _indexer: Indexer;
  private readonly _automergeHost: AutomergeHost;

  private readonly _id: string;
  private readonly _query: QueryAST.Query;
  private readonly _reactivity: QueryReactivity;

  private _plan: QueryPlan.Plan;

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

  private async _execPlan(plan: QueryPlan.Plan, workingSet: Item[]): Promise<Item[]> {
    for (const step of plan.steps) {
      workingSet = await this._execStep(step, workingSet);
    }
    return workingSet;
  }

  private async _execStep(step: QueryPlan.Step, workingSet: Item[]): Promise<Item[]> {
    switch (step._tag) {
      case 'ClearWorkingSetStep':
        return [];
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

  private async _execSelectStep(step: QueryPlan.SelectStep, workingSet: Item[]): Promise<Item[]> {
    throw new Error('Not implemented');
  }

  private async _execFilterStep(step: QueryPlan.FilterStep, workingSet: Item[]): Promise<Item[]> {
    throw new Error('Not implemented');
  }

  private async _execFilterDeletedStep(step: QueryPlan.FilterDeletedStep, workingSet: Item[]): Promise<Item[]> {
    switch (step.mode) {
      case 'only-deleted':
        return workingSet.filter((item) => ObjectStructure.isDeleted(item.doc));
      case 'only-non-deleted':
        return workingSet.filter((item) => !ObjectStructure.isDeleted(item.doc));
    }
  }

  private async _execTraverseStep(step: QueryPlan.TraverseStep, workingSet: Item[]): Promise<Item[]> {
    throw new Error('Not implemented');
  }

  private async _execUnionStep(step: QueryPlan.UnionStep, workingSet: Item[]): Promise<Item[]> {
    throw new Error('Not implemented');
  }
}
