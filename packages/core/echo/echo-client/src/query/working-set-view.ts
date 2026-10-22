//
// Copyright 2026 DXOS.org
//

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, type Obj } from '@dxos/echo';
import { filterMatchDoc } from '@dxos/echo-host/filter';
import { GroupBy, QueryPlanner, queryContainsChanges } from '@dxos/echo-host/query';
import { type EntityStructure, QueryAST } from '@dxos/echo-protocol';
import { resolveMergeRedirect } from '@dxos/echo/internal';
import { EID, EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type ItemsUpdatedEvent, type ObjectCore } from '../core-db/index.ts';
import { type FeedHandle } from '../feed/feed-handle.ts';
import { type DatabaseImpl } from '../proxy-db/index.ts';
import { type MergePlan, createMergePlan, evaluateCore, matchesFeedSelection, ordersLocally } from './merge-plan.ts';
import { type SourceEntry } from './query-context.ts';
import {
  getTargetFeedsForQuery,
  getTargetSpacesForQuery,
  isSimpleSelectionQuery,
  queryAggregateNeedsIndex,
  queryHasWindowing,
  queryIncludesAllFeeds,
  queryTargetsSpacesOrFeeds,
} from './util.ts';
import { type WorkingSetDataProvider, type WorkingSetItem, WorkingSetQueryExecutor } from './working-set-executor.ts';

/** A loaded object local evaluation admits, with the document data a window orders it by. */
export type LocalMatch = { id: string; data: EntityStructure['data'] };

/**
 * One live query's view of one database's working set: the objects loaded in this process, evaluated
 * with the same plan the host executes. Part of the {@link LocalQueryEngine}, never a query source of
 * its own: its entries are the local evidence remote answers are revalidated against.
 */
export class WorkingSetView {
  /** Fires when a write or load may have changed {@link getResults}. */
  readonly changed = new Event<void>();

  private _ctx: Context = new Context();
  private _query: QueryAST.Query | undefined = undefined;
  private _results?: SourceEntry<Obj.Any>[] = undefined;
  readonly #covers = new WeakMap<QueryAST.Query, boolean>();
  /** Asked on every subscription and completeness read, and each answer plans the whole query. */
  readonly #windowEvaluation = new WeakMap<QueryAST.Query, boolean>();
  /** Present when a write can be applied to cached results as a delta instead of a full recompute. */
  #delta?: { filter: QueryAST.Filter; options: QueryAST.QueryOptions | undefined } = undefined;
  /** Present when the query selects from feeds: their unacknowledged writes, which no index has seen yet. */
  #feedTail?: FeedTail = undefined;
  private readonly _executor: WorkingSetQueryExecutor;
  private readonly _planner: QueryPlanner;

  constructor(private readonly _database: DatabaseImpl) {
    const provider: WorkingSetDataProvider = {
      get spaceId(): SpaceId {
        return _database.spaceId;
      },
      allCores: () => _database.allObjectCores(),
      getCoreById: (id) => _database.getObjectCoreById(id, { load: false }),
      areStrongDepsSatisfied: (core) => _database.areStrongDepsSatisfied(core),
      areStrongDepsResolved: (core) => _database.areStrongDepsResolved(core),
    };
    this._executor = new WorkingSetQueryExecutor(provider);
    this._planner = new QueryPlanner({ defaultTextSearchKind: 'full-text', noIndexes: true });
  }

  get spaceId(): SpaceId {
    return this._database.spaceId;
  }

  /** Objects each local commit in this database wrote, delivered before the commit's db update event. */
  get localCommits(): ReadOnlyEvent<ItemsUpdatedEvent> {
    return this._database._localCommitEvent;
  }

  /** Whether this view evaluates the current query itself. */
  isServing(): boolean {
    return this._query !== undefined || this.#feedTail !== undefined;
  }

  /**
   * Whether this view's answer to the current query is authoritative for what the working set holds. Windows
   * (`order`/`skip`/`limit`) and aggregates that need the index are left to the remotes.
   */
  isSynchronous(): boolean {
    if (this.#feedTail) {
      return true;
    }
    return (
      this._query !== undefined &&
      this._servesSpaceScope(this._query) &&
      this.#evaluatesWindow(this._query) &&
      !queryAggregateNeedsIndex(this._query)
    );
  }

  /** Whether `query` selects from this space, whether or not this view evaluates it itself. */
  covers(query: QueryAST.Query): boolean {
    // Asked on every local write for every live query, and each answer walks the whole AST.
    let covers = this.#covers.get(query);
    if (covers === undefined) {
      covers = this._isValidForQuery(query) && this._servesSpaceScope(query);
      this.#covers.set(query, covers);
    }
    return covers;
  }

  coreById(id: string): ObjectCore | undefined {
    return this._database.getObjectCoreById(id, { load: false });
  }

  /** Whether the object is loaded here with a body, so local evaluation decides its membership. */
  holdsBody(id: string): boolean {
    return this.coreById(id)?.getObjectStructure() !== undefined;
  }

  /** The live end of `id`'s convergence-key merge redirects here: a merged-away loser stands for its survivor. */
  survivorId(id: string): string {
    return EntityId.isValid(id)
      ? resolveMergeRedirect(EntityId.make(id), (current) => this.coreById(current)?.getMergedInto())
      : id;
  }

  /**
   * Every object with an unindexed local write that local evaluation admits under the plan's flat filter and `admit`
   * accepts by its document data, with that data.
   */
  matchLocal(plan: MergePlan, admit?: (data: EntityStructure['data']) => boolean): LocalMatch[] {
    const matches: LocalMatch[] = [];
    // Only an object with a local write the index has not seen can be missing from an index answer.
    for (const id of this._database.unindexedWrites()) {
      const core = this.coreById(id);
      const data = core?.getObjectStructure()?.data;
      // `admit` reads one sort key and runs first, so the full filter only sees objects inside the window.
      if (
        core &&
        data !== undefined &&
        (admit === undefined || admit(data)) &&
        evaluateCore(plan, core) === true &&
        // Every other working-set result waits for its strong dependencies, so an admitted one does too.
        this._database.areStrongDepsSatisfied(core)
      ) {
        matches.push({ id, data });
      }
    }
    return matches;
  }

  /** A working-set entry for a loaded object, as `matchLocal` admitted it. */
  entryFor(id: string): SourceEntry<Obj.Unknown> | undefined {
    const result = this._database.getObjectById<Obj.Unknown>(id, { deleted: true });
    return result ? { id, result, match: { rank: 1 }, resolution: { source: 'local', time: 0 } } : undefined;
  }

  /** The object of a feed write in the query's scope that no index has seen, if `id` is one. */
  feedLocalWrite(id: string): Entity.Unknown | undefined {
    if (!this.#feedTail || !EntityId.isValid(id)) {
      return undefined;
    }
    const entityId = EntityId.make(id);
    for (const handle of this.#feedTail.handles) {
      const object = handle.getLocalWrite(entityId);
      if (object) {
        return object;
      }
    }
    return undefined;
  }

  close(): void {
    this._query = undefined;
    this.#feedTail = undefined;
    this._results = undefined;
    void this._ctx.dispose().catch((err) => log.catch(err));
  }

  update(query: QueryAST.Query): void {
    void this._ctx.dispose().catch((err) => log.catch(err));
    this._ctx = new Context();
    this._results = undefined;
    this.#watchFeedTail(query);
    if (this.#feedTail || isFeedSelection(query)) {
      // A feed the query reaches can be first opened after it starts, by the write that should show up in it.
      this._database._feedHandleCreated.on(this._ctx, () => {
        this.#watchFeedTail(query);
        this.changed.emit();
      });
    }
    if (!this._evaluates(query)) {
      this._query = undefined;
      this.#delta = undefined;
      if (this.#feedTail) {
        this.changed.emit();
      }
      return;
    }
    this._query = query;
    this.#delta = deltaFor(query);
    this._database._updateEvent.on(this._ctx, this._onUpdate);
    this.changed.emit();
  }

  getResults(): SourceEntry[] {
    const space = this._query ? (this._results ??= this._compute(this._query)) : [];
    return this.#feedTail ? [...space, ...feedEntries(this.#feedTail)] : space;
  }

  /** A one-shot answer from what the working set holds now; nothing is loaded. */
  evaluate(query: QueryAST.Query): SourceEntry[] {
    const space = this._evaluates(query) ? this._compute(query) : [];
    const tail = this.#feedTailFor(query);
    return tail ? [...space, ...feedEntries(tail)] : space;
  }

  #watchFeedTail(query: QueryAST.Query): void {
    const watched = new Set(this.#feedTail?.handles);
    this.#feedTail = this.#feedTailFor(query);
    for (const handle of this.#feedTail?.handles ?? []) {
      if (watched.has(handle)) {
        continue;
      }
      // Both fire inside the write, so a feed write reaches the query before the writing call returns.
      handle.localWrite.on(this._ctx, () => this.changed.emit());
      handle.updated.on(this._ctx, () => this.changed.emit());
    }
  }

  /** The feeds a simple selection reaches in this space, whose local writes it matches; undefined otherwise. */
  #feedTailFor(query: QueryAST.Query): FeedTail | undefined {
    const simple = isSimpleSelectionQuery(query);
    if (!simple || !isFeedSelection(query)) {
      return undefined;
    }
    const allFeeds = queryIncludesAllFeeds(query);
    const handles = allFeeds
      ? [...this._database._knownFeedHandles()]
      : getTargetFeedsForQuery(query).flatMap((uri) => {
          const eid = EID.tryParse(uri);
          const handle = eid ? this._database._tryGetFeedHandle(eid) : undefined;
          return handle ? [handle] : [];
        });
    return handles.length > 0 ? { filter: simple.filter, options: simple.options, handles } : undefined;
  }

  /** Loads the objects into the working set through their documents. */
  async load(ids: readonly EntityId[]): Promise<void> {
    await this._database.batchLoadObjectCores([...ids]);
  }

  /**
   * Whether the working set's answer is a true part of the result under the query's windowing: there is none,
   * or it is only an order the engine re-applies over the merged entries. A limit or skip is a slice of a set the
   * working set does not hold, so only the remote can cut it.
   */
  #evaluatesWindow(query: QueryAST.Query): boolean {
    if (!queryHasWindowing(query)) {
      return true;
    }
    let evaluates = this.#windowEvaluation.get(query);
    if (evaluates === undefined) {
      evaluates = evaluatesOrderOnly(query);
      this.#windowEvaluation.set(query, evaluates);
    }
    return evaluates;
  }

  private _evaluates(query: QueryAST.Query): boolean {
    return this._isValidForQuery(query) && this._servesSpaceScope(query) && this.#evaluatesWindow(query);
  }

  private _onUpdate = (updateEvent?: ItemsUpdatedEvent): void => {
    if (!this._query) {
      return;
    }

    if (!updateEvent) {
      this._results = undefined;
      this.changed.emit();
      return;
    }

    if (this._results && this.#delta) {
      if (this.#applyDelta(this._results, this.#delta, updateEvent)) {
        this.changed.emit();
      }
      return;
    }

    // Uncomputed results still signal a relevant write: a subscriber that has not read yet is notified of it
    // before the write returns, rather than at whatever later event first computes its results.
    const resultIds = new Set((this._results ?? []).map((result) => result.id));
    const query = this._query;
    const changed = updateEvent.itemsUpdated.some(({ id: objectId }) => {
      if (resultIds.has(objectId)) {
        return true;
      }
      // A simple selection decides a written object by its own document; anything else recomputes.
      const simple = isSimpleSelectionQuery(query);
      if (simple && !simple.hasQueues) {
        const core = this._database._entityManager.getObjectCoreById(objectId, { load: false });
        return core != null && this._filterCore(core, simple.filter, simple.options);
      }
      return true;
    });

    if (changed) {
      this._results = undefined;
      this.changed.emit();
    }
  };

  /**
   * Applies written objects to the cached results, in the natural (id) order a full recompute produces, so a
   * synchronous notification per write costs the write rather than a working-set scan.
   *
   * @returns whether membership changed.
   */
  #applyDelta(
    results: SourceEntry<Obj.Any>[],
    { filter, options }: { filter: QueryAST.Filter; options: QueryAST.QueryOptions | undefined },
    event: ItemsUpdatedEvent,
  ): boolean {
    const entityManager = this._database._entityManager;
    let next = results;
    for (const { id } of event.itemsUpdated) {
      const core = entityManager.getObjectCoreById(id, { load: false });
      const matches = core != null && this._filterCore(core, filter, options);
      const index = next.findIndex((entry) => entry.id === id);
      if (index >= 0 && !matches) {
        next = next.toSpliced(index, 1);
      } else if (index < 0 && matches) {
        const position = next.findIndex((entry) => compareIds(entry.id, id) > 0);
        next = next.toSpliced(position < 0 ? next.length : position, 0, {
          id,
          result: this._database.getObjectById<Obj.Any>(id, { deleted: true }),
          match: { rank: 1 },
          resolution: { source: 'local', time: 0 },
        });
      }
    }
    if (next === results) {
      return false;
    }
    this._results = next;
    return true;
  }

  /**
   * Runs the planner and the working-set executor over this database. Empty when the plan needs index
   * capabilities the working set lacks (full-text or timestamp selectors), which the remotes answer. A
   * planner failure is a hard error: it must accept every query this view evaluates.
   */
  private _compute(query: QueryAST.Query): SourceEntry<Obj.Unknown>[] {
    const items = this._executor.tryExecute(this._planner.createPlan(query));
    return items === null ? [] : this._mapItemsToResults(items);
  }

  /** Per-group counts are computed once over the full set rather than per item. */
  private _mapItemsToResults(items: WorkingSetItem[]): SourceEntry<Obj.Unknown>[] {
    const groupCounts = new Map<string, number>();
    for (const item of items) {
      if (item.groupKey === undefined) {
        continue;
      }
      const serialized = GroupBy.serializeGroupKey(item.groupKey);
      groupCounts.set(serialized, (groupCounts.get(serialized) ?? 0) + 1);
    }
    return items.map((item) => {
      const serializedGroupKey = item.groupKey !== undefined ? GroupBy.serializeGroupKey(item.groupKey) : undefined;
      return {
        id: item.objectId,
        result: this._database.getObjectById<Obj.Unknown>(item.objectId, { deleted: true }),
        match: { rank: 1 },
        resolution: { source: 'local', time: 0 },
        group:
          item.groupKey !== undefined && serializedGroupKey !== undefined
            ? { key: item.groupKey, count: groupCounts.get(serializedGroupKey) ?? 1 }
            : undefined,
      };
    });
  }

  private _isValidForQuery(query: QueryAST.Query): boolean {
    if (queryContainsChanges(query)) {
      return false;
    }
    const targetSpaces = getTargetSpacesForQuery(query);
    if (targetSpaces.length > 0 && !targetSpaces.includes(this.spaceId)) {
      return false;
    }
    // A query whose explicit scopes name neither spaces nor feeds (registry-only) is not this view's.
    return queryTargetsSpacesOrFeeds(query);
  }

  /**
   * Whether the query selects from the space working set: it has no explicit `from` scope (the owning space)
   * or its scope includes a space. Feed-only queries do not: the working set holds no feed items.
   */
  private _servesSpaceScope(query: QueryAST.Query): boolean {
    let hasExplicitNonEmptyScope = false;
    let hasSpaceScope = false;
    QueryAST.visit(query, (node) => {
      if (node.type === 'from' && node.from._tag === 'scope' && node.from.scopes.length > 0) {
        hasExplicitNonEmptyScope = true;
        if (node.from.scopes.some((scope) => scope._tag === 'space')) {
          hasSpaceScope = true;
        }
      }
    });
    return !hasExplicitNonEmptyScope || hasSpaceScope;
  }

  private _filterCore(core: ObjectCore, filter: QueryAST.Filter, options: QueryAST.QueryOptions | undefined): boolean {
    // A core whose body has not landed matches nothing: there is no document to filter against.
    const structure = core.getObjectStructure();
    if (structure === undefined) {
      return false;
    }
    return (
      this._database.areStrongDepsSatisfied(core) &&
      filterCoreByDeletedFlag(core, options) &&
      filterMatchDoc(filter, { id: core.id, doc: structure, spaceId: this.spaceId })
    );
  }
}

const evaluatesOrderOnly = (query: QueryAST.Query): boolean => {
  let local = true;
  QueryAST.visit(query, (node) => {
    if (node.type === 'limit' || node.type === 'skip' || (node.type === 'order' && !ordersLocally(node.order))) {
      local = false;
    }
  });
  return local && createMergePlan(query).order !== undefined;
};

/** The unacknowledged writes of the feeds a simple selection reaches, and the selection they are matched against. */
/** Whether the query is a simple selection over feeds, whose tail can grow a handle after it starts. */
const isFeedSelection = (query: QueryAST.Query): boolean => {
  const simple = isSimpleSelectionQuery(query);
  return simple !== null && (simple.hasQueues === true || queryIncludesAllFeeds(query)) && !queryContainsChanges(query);
};

type FeedTail = {
  filter: QueryAST.Filter;
  options: QueryAST.QueryOptions | undefined;
  handles: readonly FeedHandle[];
};

const feedEntries = ({ filter, options, handles }: FeedTail): SourceEntry[] =>
  handles.flatMap((handle) =>
    handle
      .localWrites()
      .flatMap((object): SourceEntry[] =>
        matchesFeedSelection(filter, options, object)
          ? [{ id: object.id, result: object, match: { rank: 1 }, resolution: { source: 'local', time: 0 } }]
          : [],
      ),
  );

/** Natural order: code units, as the host and the working-set executor sort ids. */
export const compareIds = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

/**
 * The filter and options a write can be applied to as a delta: a single flat selection by type or wildcard
 * with predicates a single document decides, which is exactly what `_filterCore` evaluates. By-id selection
 * is excluded because the executor admits it on resolved rather than satisfied strong dependencies.
 */
const deltaFor = (
  query: QueryAST.Query,
): { filter: QueryAST.Filter; options: QueryAST.QueryOptions | undefined } | undefined => {
  const simple = isSimpleSelectionQuery(query);
  const { branches } = QueryAST.characteristics(query);
  const [branch] = branches;
  const eligible =
    simple !== null &&
    !simple.hasQueues &&
    branches.length === 1 &&
    branch.class === 'local-partial' &&
    (branch.selection === 'type' || branch.selection === 'wildcard') &&
    branch.predicates === 'local' &&
    branch.traversal === 0 &&
    branch.aggregate === 'none';
  return eligible ? { filter: simple.filter, options: simple.options } : undefined;
};

const filterCoreByDeletedFlag = (core: ObjectCore, options: QueryAST.QueryOptions | undefined): boolean => {
  switch (options?.deleted) {
    case undefined:
    case 'exclude':
      return !core.isDeleted();
    case 'include':
      return true;
    case 'only':
      return core.isDeleted();
  }
};
