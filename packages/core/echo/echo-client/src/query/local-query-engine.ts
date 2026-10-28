//
// Copyright 2022 DXOS.org
//

import { Event, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, Query, type QueryResult, type Registry } from '@dxos/echo';
import { type EntityStructure, type QueryAST } from '@dxos/echo-protocol';
import { type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type DeletionMemo, type ItemsUpdatedEvent } from '../core-db/index.ts';
import { isEchoObject } from '../echo-handler/index.ts';
import { type DatabaseImpl } from '../proxy-db/index.ts';
import { adjustGroups, withMembers } from './manifest-merge.ts';
import {
  type MergePlan,
  compareEntries,
  compareWindowData,
  createMergePlan,
  judgeRemoteEntry,
  localVersion,
  windowData,
  writeAffects,
} from './merge-plan.ts';
import { type CoreLookup } from './path-revalidation.ts';
import { type QueryContext, type QueryContextRunOptions, type SourceEntry } from './query-context.ts';
import { RegistryView } from './registry-view.ts';
import { type RemoteQuerySource } from './remote-query-source.ts';
import { isSimpleSelectionQuery } from './util.ts';
import { WorkingSetView, compareIds } from './working-set-view.ts';

export type LocalQueryEngineProps = {
  registry: Registry.Registry;
  onStart: () => void;
  onStop: () => void;
};

/**
 * The local query engine, one per live query: it answers from the working set of every database and from the
 * registry synchronously, and merges what remote sources answer as evidence the working set revalidates
 * before it is presented. See `docs/SYNC_QUERIES.md` §3.2.
 */
export class LocalQueryEngine implements QueryContext {
  readonly changed = new Event<void>();

  readonly #spaces = new Map<SpaceId, WorkingSetView>();
  readonly #registry: RegistryView;
  readonly #remotes = new Set<RemoteQuerySource>();

  #query?: QueryAST.Query = undefined;
  #plan?: MergePlan = undefined;
  #ctx?: Context = undefined;

  /**
   * Whether the remotes run the current query. Off for a by-id query whose every id is loaded with a body
   * here: replication keeps a loaded document current, so the working set alone is authoritative for it.
   */
  #remotesActive = false;

  /** Remote answers integrated when a local write last fell in scope; the answer is stale until they pass it. */
  #staleAt?: number = undefined;

  /** Ids of the current by-id query already sent to load through their documents. */
  readonly #loadRequested = new Set<string>();
  /** Each aggregate query with its members listed, which a manifest adjustment evaluates on every merge. */
  readonly #membersQueries = new WeakMap<QueryAST.Query, QueryAST.Query>();

  constructor(private readonly _params: LocalQueryEngineProps) {
    this.#registry = new RegistryView(_params.registry);
  }

  /** The remote sources this engine merges, for diagnostics and tests. */
  get remotes(): ReadonlySet<RemoteQuerySource> {
    return this.#remotes;
  }

  addDatabase(database: DatabaseImpl): void {
    if (this.#spaces.has(database.spaceId)) {
      return;
    }
    const view = new WorkingSetView(database);
    this.#spaces.set(database.spaceId, view);
    if (this.#ctx) {
      this.#watchSpace(this.#ctx, view);
    }
    if (this.#query) {
      view.update(this.#query);
      this.#syncRemotes();
    }
  }

  addRemoteSource(source: RemoteQuerySource): void {
    this.#remotes.add(source);
    if (this.#ctx) {
      source.open();
      source.changed.on(
        this.#ctx,
        whileLive(this.#ctx, () => this.#onRemoteChanged()),
      );
      if (this.#remotesActive && this.#query) {
        source.update(this.#query);
      }
    }
  }

  start(): void {
    const ctx = new Context();
    this.#ctx = ctx;
    this._params.onStart();
    for (const view of this.#spaces.values()) {
      if (this.#query) {
        view.update(this.#query);
      }
      this.#watchSpace(ctx, view);
    }
    if (this.#query) {
      this.#registry.update(this.#query);
    }
    this.#registry.changed.on(
      ctx,
      whileLive(ctx, () => this.changed.emit()),
    );
    for (const source of this.#remotes) {
      source.open();
    }
    this.#remotesActive = false;
    this.#syncRemotes();
    // Subscribing after `update` skips the `changed` events the update itself generates.
    for (const source of this.#remotes) {
      source.changed.on(
        ctx,
        whileLive(ctx, () => this.#onRemoteChanged()),
      );
    }
    this.#loadUnanswered();
  }

  stop(): void {
    void this.#ctx?.dispose().catch((err) => log.catch(err));
    this.#ctx = undefined;
    // The views hold their own subscriptions, which would otherwise outlive the query's.
    for (const view of this.#spaces.values()) {
      view.close();
    }
    this.#registry.close();
    for (const source of this.#remotes) {
      source.close();
    }
    this.#remotesActive = false;
    this.#staleAt = undefined;
    this.#loadRequested.clear();
    this._params.onStop();
  }

  update(query: QueryAST.Query): void {
    this.#query = query;
    this.#plan = createMergePlan(query);
    this.#staleAt = undefined;
    for (const view of this.#spaces.values()) {
      view.update(query);
    }
    this.#registry.update(query);
    this.#remotesActive = false;
    this.#loadRequested.clear();
    this.#syncRemotes();
    this.#loadUnanswered();
  }

  getResults(): SourceEntry[] {
    const query = this.#query;
    const plan = this.#plan;
    if (!query || !plan) {
      return [];
    }
    const local: SourceEntry[] = [];
    for (const view of this.#spaces.values()) {
      local.push(...view.getResults());
    }
    // A space entry wins over a registry entry with the same id: presentation keeps the first occurrence.
    local.push(...this.#registry.getResults());
    const remote = this.#remotesActive ? [...this.#remotes].flatMap((source) => source.getResults()) : [];
    const remoteAnswered = this.#servingRemotes().some((source) => source.answers() > 0);
    return this.#merge(query, plan, local, remote, remoteAnswered);
  }

  /**
   * Whether an in-process view answers the current query authoritatively. False when only remotes serve it
   * (a feed query), so a subscriber defers its initial event until they answer.
   */
  isSynchronous(): boolean {
    if (!this.#query) {
      return false;
    }
    return [...this.#spaces.values()].some((view) => view.isSynchronous()) || this.#registry.isServing();
  }

  hasPendingSources(): boolean {
    if (!this.#query) {
      return true;
    }
    return this.#servingRemotes().some((source) => source.isPending());
  }

  getCompleteness(): QueryResult.Completeness {
    const plan = this.#plan;
    const query = this.#query;
    if (!query || !plan) {
      return 'pending';
    }
    const remote = this.#servingRemotes();
    if (remote.length === 0 || this.#holdsAllIds(query, plan)) {
      return 'complete';
    }
    if (remote.some((source) => source.isFailed())) {
      return 'failed';
    }
    const answered = remote.filter((source) => source.answers() > 0);
    if (answered.length === 0) {
      // The working set claims text and timestamp queries it then declines, so the AST decides, not the view.
      const localContributes =
        plan.characteristics.synchronous &&
        ([...this.#spaces.values()].some((view) => view.isServing()) || this.#registry.isServing());
      return localContributes ? 'local-only' : 'pending';
    }
    if (this.#staleAt !== undefined && this.#remoteAnswers() <= this.#staleAt) {
      return 'stale';
    }
    return answered.length < remote.length || remote.some((source) => source.isTruncated()) ? 'merged' : 'complete';
  }

  getRemoteExecutionTime(): number | undefined {
    let total: number | undefined;
    for (const source of this.#servingRemotes()) {
      const executionTime = source.executionTime?.();
      if (executionTime !== undefined) {
        total = (total ?? 0) + executionTime;
      }
    }
    return total;
  }

  getSourceStates(): QueryResult.SourceState[] {
    const states: QueryResult.SourceState[] = [];
    if ([...this.#spaces.values()].some((view) => view.isServing())) {
      states.push({ source: 'local', state: 'answered', answers: 0 });
    }
    if (this.#registry.isServing()) {
      states.push({ source: 'registry', state: 'answered', answers: 0 });
    }
    for (const source of this.#servingRemotes()) {
      states.push({
        source: source.kind,
        state: source.isFailed() ? 'failed' : source.answers() > 0 ? 'answered' : 'pending',
        answers: source.answers(),
      });
    }
    return states;
  }

  async run(
    ctx: Context,
    query: QueryAST.Query,
    { timeout = 30_000, onExecutionTime }: QueryContextRunOptions = {},
  ): Promise<SourceEntry[]> {
    // Only the synchronous parts are timed: the awaits below wait on remotes and document loads.
    const timed = <R>(work: () => R): R => {
      const begin = performance.now();
      try {
        return work();
      } finally {
        onExecutionTime?.(performance.now() - begin);
      }
    };
    const { plan, local } = timed(() => ({ plan: createMergePlan(query), local: this.#evaluateLocal(query) }));
    const ids = getSelectedIds(query);
    if (ids === undefined) {
      const remote = await this.#runRemotes(ctx, query, timeout, onExecutionTime);
      return timed(() => this.#merge(query, plan, local, remote ?? [], remote !== undefined));
    }

    // By id: the working set first, then the index for what it lacks, and only what neither holds is loaded
    // through its document — an index row is placed without loading one.
    const deadline = performance.now() + timeout;
    const missing = (entries: readonly SourceEntry[], wanted: readonly EntityId[]): EntityId[] => {
      const found = new Set(entries.map((entry) => entry.id));
      return wanted.filter((id) => !found.has(id));
    };
    let unresolved = missing(local, ids);
    if (unresolved.length === 0) {
      return local;
    }
    const remote = await this.#runRemotes(
      ctx,
      selectIds(query, unresolved),
      deadline - performance.now(),
      onExecutionTime,
    ).catch((err) => {
      // The documents are still there to load; an index that cannot answer is not a miss.
      log('index could not answer a by-id run; loading the objects instead', { err });
      return undefined;
    });
    unresolved = missing(remote ?? [], unresolved);
    const loaded: SourceEntry[] = [];
    if (unresolved.length > 0) {
      const views = [...this.#spaces.values()].filter((view) => view.covers(query));
      await asyncTimeout(
        Promise.all(views.map((view) => view.load(unresolved))),
        Math.max(0, deadline - performance.now()),
      );
      const reselected = selectIds(query, unresolved);
      timed(() => {
        for (const view of views) {
          loaded.push(...view.evaluate(reselected));
        }
      });
    }
    return timed(() => this.#merge(query, plan, [...local, ...loaded], remote ?? [], remote !== undefined));
  }

  #evaluateLocal(query: QueryAST.Query): SourceEntry[] {
    const local: SourceEntry[] = [];
    for (const view of this.#spaces.values()) {
      local.push(...view.evaluate(query));
    }
    local.push(...this.#registry.evaluate(query));
    return local;
  }

  /** Every remote's one-shot answer, or undefined when no remote serves the query. */
  async #runRemotes(
    ctx: Context,
    query: QueryAST.Query,
    timeout: number,
    onExecutionTime?: (executionTime: number) => void,
  ): Promise<SourceEntry[] | undefined> {
    if (this.#remotes.size === 0) {
      return undefined;
    }
    const answers = await Promise.all(
      [...this.#remotes].map(async (source) => {
        log('run query', { source: source.kind, query: Query.pretty(Query.fromAst(query)) });
        const results = await asyncTimeout(source.run(ctx, query, { onExecutionTime }), Math.max(0, timeout));
        log('run query results', { source: source.kind, count: results.length });
        return results;
      }),
    );
    return answers.flat();
  }

  #onRemoteChanged(): void {
    this.#loadUnanswered();
    this.changed.emit();
  }

  /**
   * Loads, through their documents, the ids of a live by-id query that nothing else will bring in: no remote
   * serves the query, or every remote answered without them. Anything the index answers is placed from its row.
   */
  #loadUnanswered(): void {
    const query = this.#query;
    const plan = this.#plan;
    if (!this.#ctx || !query || !plan?.ids || !this.#remotesActive) {
      return;
    }
    const remotes = this.#servingRemotes();
    if (remotes.some((source) => source.answers() === 0 && !source.isFailed())) {
      return;
    }
    const answered = new Set(remotes.flatMap((source) => source.getResults().map((entry) => entry.id)));
    const views = [...this.#spaces.values()].filter((view) => view.covers(query));
    const missing = plan.ids.filter(
      (id) => !answered.has(id) && !this.#loadRequested.has(id) && !views.some((view) => view.holdsBody(id)),
    );
    if (missing.length === 0) {
      return;
    }
    for (const id of missing) {
      this.#loadRequested.add(id);
    }
    for (const view of views) {
      view.load(missing).catch((err) => log('by-id objects did not load', { err }));
    }
  }

  /**
   * Starts the remotes on the current query unless the working set already answers it whole, and stops them
   * again once it does.
   */
  #syncRemotes(): void {
    const query = this.#query;
    const plan = this.#plan;
    if (!this.#ctx || !query || !plan) {
      return;
    }
    const wanted = !this.#holdsAllIds(query, plan);
    if (wanted === this.#remotesActive) {
      return;
    }
    this.#remotesActive = wanted;
    for (const source of this.#remotes) {
      if (wanted) {
        source.update(query);
      } else {
        // Reopened idle: `update` is what starts a stream.
        source.close();
        source.open();
      }
    }
  }

  /**
   * In-process entries, then every remote entry local evidence does not overrule, in natural order when the
   * query has no order of its own. A property-ordered window also admits local matches that sort within the
   * remote window, re-sorted and cut to its limit.
   */
  #merge(
    query: QueryAST.Query,
    plan: MergePlan,
    local: SourceEntry[],
    remote: SourceEntry[],
    remoteAnswered: boolean,
  ): SourceEntry[] {
    const views = [...this.#spaces.values()].filter((view) => view.covers(query));
    if (plan.manifest && remoteAnswered) {
      let listed = this.#membersQueries.get(query);
      if (!listed) {
        listed = withMembers(query);
        this.#membersQueries.set(query, listed);
      }
      const members = views.flatMap((view) => view.evaluate(listed));
      // A by-id selection also returns members whose dependencies settled unavailable, which `surfaces` does not admit.
      const evaluated = new Set(members.map((entry) => entry.id));
      const adjusted = adjustGroups(plan.manifest, remote, members, {
        held: (id) => evaluated.has(id) || views.some((view) => view.surfaces(id)),
        survivor: (id) => views.find((view) => view.holdsBody(id))?.survivorId(id) ?? id,
      });
      if (adjusted) {
        return adjusted.entries;
      }
    }
    const lookup = coreLookup(views);
    // The merge is synchronous, so no core changes under it; without the memo it costs entries × depth.
    const memo: DeletionMemo = new Map();
    const kept: SourceEntry[] = [];
    for (const entry of remote) {
      const verdict = judgeRemoteEntry(
        plan,
        entry,
        lookup,
        (id) => views.reduce<Entity.Unknown | undefined>((found, view) => found ?? view.feedLocalWrite(id), undefined),
        memo,
      );
      if (verdict !== 'drop') {
        kept.push(withVerdict(entry, verdict === 'verified'));
      }
    }
    if (!plan.window) {
      const merged = plan.feed ? feedOrder(local, kept) : [...local, ...kept];
      // Stable, so an in-process entry stays ahead of the remote duplicate that presentation drops.
      if (plan.order) {
        const orders = plan.order;
        const keyed = merged.map((entry) => ({ entry, key: { id: entry.id, data: windowData(entry) } }));
        keyed.sort((left, right) => compareEntries(orders, left.key, right.key));
        return keyed.map(({ entry }) => entry);
      }
      return plan.natural ? merged.sort((left, right) => compareIds(left.id, right.id)) : merged;
    }
    // A window is the remote's to define; before it answers there is nothing to admit into. An empty answer is an
    // answer, so local writes the index has not seen still enter it.
    if (!remoteAnswered) {
      return kept;
    }
    const { orders, limit } = plan.window;
    // Sort data is read once per candidate, since a comparison against the live document re-reads it on
    // every step of the sort, and only local matches that land inside the window are built into entries.
    const candidates: WindowCandidate[] = kept.map((entry) => ({ id: entry.id, data: windowData(entry), entry }));
    // A short remote window is the whole result, so every local match belongs; a full one bounds admission.
    const full = remote.length >= limit;
    const boundary = full ? windowData(remote[remote.length - 1]) : undefined;
    const admit = full ? (data: EntityStructure['data']) => compareWindowData(orders, data, boundary) <= 0 : undefined;
    const seen = new Set(kept.map((entry) => entry.id));
    for (const view of this.#spaces.values()) {
      if (!view.covers(query)) {
        continue;
      }
      for (const match of view.matchLocal(plan, admit, memo)) {
        if (seen.has(match.id)) {
          continue;
        }
        seen.add(match.id);
        candidates.push({ id: match.id, data: match.data, view });
      }
    }
    // Stable, so entries the remote ordered as equals keep their order ahead of local matches that tie with them.
    candidates.sort((left, right) => compareWindowData(orders, left.data, right.data));
    const window: SourceEntry[] = [];
    for (const candidate of candidates) {
      if (window.length === limit) {
        break;
      }
      const entry = 'entry' in candidate ? candidate.entry : candidate.view.entryFor(candidate.id);
      if (entry) {
        window.push(entry);
      }
    }
    return window;
  }

  #watchSpace(ctx: Context, view: WorkingSetView): void {
    view.changed.on(
      ctx,
      whileLive(ctx, () => {
        this.#syncRemotes();
        this.changed.emit();
      }),
    );
    view.localCommits.on(
      ctx,
      whileLive(ctx, (event: ItemsUpdatedEvent) => this.#onLocalCommit(view, event)),
    );
  }

  /**
   * A local write in scope marks a remote answer that local evidence cannot fully overrule as stale, and
   * re-merges a query the working set does not evaluate itself (a window), whose entries it may now overrule.
   */
  #onLocalCommit(view: WorkingSetView, event: ItemsUpdatedEvent): void {
    const plan = this.#plan;
    const query = this.#query;
    if (!query || !plan || !view.covers(query)) {
      return;
    }
    if (!event.itemsUpdated.some(({ id }) => writeAffects(plan, view.coreById(id)))) {
      return;
    }
    if (plan.staleOnLocalWrite && this.#servingRemotes().length > 0) {
      this.#staleAt = this.#remoteAnswers();
    }
    if (!view.isServing()) {
      this.changed.emit();
    }
  }

  #servingRemotes(): RemoteQuerySource[] {
    return this.#remotesActive ? [...this.#remotes].filter((source) => source.isServing()) : [];
  }

  #remoteAnswers(): number {
    return this.#servingRemotes().reduce((sum, source) => sum + source.answers(), 0);
  }

  /** A by-id query is whole once every id it names is loaded with a body in a space it covers. */
  #holdsAllIds(query: QueryAST.Query, plan: MergePlan): boolean {
    if (!plan.ids || plan.ids.length === 0) {
      return false;
    }
    const views = [...this.#spaces.values()].filter((view) => view.covers(query));
    return plan.ids.every((id) => views.some((view) => view.holdsBody(id)));
  }
}

/** Local evidence for path checks: a covered view's loaded core with its document's heads. */
const coreLookup =
  (views: readonly WorkingSetView[]): CoreLookup =>
  (id) => {
    for (const view of views) {
      const core = view.coreById(id);
      if (core?.getObjectStructure() !== undefined) {
        return { core, heads: localVersion(core)?.heads };
      }
    }
    return undefined;
  };

/** The entry as presented, carrying whether local evidence confirmed it. */
const withVerdict = (entry: SourceEntry, verified: boolean): SourceEntry =>
  entry.resolution ? { ...entry, resolution: { ...entry.resolution, version: entry.version, verified } } : entry;

/** A remote entry or a local match competing for a window's slots, with its sort data read once. */
type WindowCandidate = { id: string; data: EntityStructure['data'] | undefined } & (
  | { entry: SourceEntry }
  | { view: WorkingSetView }
);

const getSelectedIds = (query: QueryAST.Query): readonly EntityId[] | undefined => {
  const simple = isSimpleSelectionQuery(query);
  return simple?.filter.type === 'object' && simple.filter.id?.length ? simple.filter.id : undefined;
};

// Walks the shape `getSelectedIds` accepts, so a nested `from` query keeps its own filter.
const selectIds = (query: QueryAST.Query, ids: readonly EntityId[]): QueryAST.Query => {
  switch (query.type) {
    case 'options':
    case 'from':
      return { ...query, query: selectIds(query.query, ids) };
    case 'select':
      return query.filter.type === 'object' ? { ...query, filter: { ...query.filter, id: [...ids] } } : query;
    default:
      return query;
  }
};

/**
 * A listener that ignores events once its context is disposed: disposal removes listeners asynchronously, so a
 * write in the same tick as `stop` would otherwise still reach a stopped engine.
 */
const whileLive =
  <T>(ctx: Context, handler: (value: T) => void) =>
  (value: T): void => {
    if (!ctx.disposed) {
      handler(value);
    }
  };

/**
 * A feed's order is its blocks' order, which only the remote knows: writes made here that it has not answered yet
 * are the newest, so they follow its entries rather than lead them, and the remote's entry stands for one it has.
 */
const feedOrder = (local: readonly SourceEntry[], kept: readonly SourceEntry[]): SourceEntry[] => {
  const answered = new Set(kept.map((entry) => entry.id));
  const tail = local.filter((entry) => !isEchoObject(entry.result));
  return [
    ...local.filter((entry) => isEchoObject(entry.result)),
    ...kept,
    ...tail.filter((entry) => !answered.has(entry.id)),
  ];
};
