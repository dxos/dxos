//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';

import { Entity } from '@dxos/echo';
import { filterMatchDoc, filterMatchEntity } from '@dxos/echo-host/filter';
import { EncodedReference, type EntityStructure, QueryAST } from '@dxos/echo-protocol';
import { DXN, type EntityId } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import { type DeletionMemo, type ObjectCore } from '../core-db/index.ts';
import { getObjectCore, isEchoObject } from '../echo-handler/index.ts';
import { type ManifestPlan } from './manifest-merge.ts';
import { type CoreLookup, type PathPlan, checkPaths, pathPlanOf } from './path-revalidation.ts';
import { type SourceEntry } from './query-context.ts';
import { getQueryDeletedOption, isSimpleSelectionQuery, queryIncludesAllFeeds } from './util.ts';
import { compareOrderValues } from './working-set-executor.ts';

/**
 * How the local engine merges in-process results with remote answers for one query, derived once from its
 * AST. See `docs/SYNC_QUERIES.md` §3.1-§3.4.
 */
export type MergePlan = {
  characteristics: QueryAST.Characteristics;
  /**
   * Present when local evidence overrules a remote entry: the query is one flat branch, so a loaded
   * object's membership depends on its own document alone.
   */
  revalidate?: {
    filter: QueryAST.Filter;
    deleted: 'exclude' | 'include' | 'only';
  };
  /** Present when local matches may enter a remote window: a property order with a limit and no skip. */
  window?: {
    orders: readonly QueryAST.Order[];
    limit: number;
  };
  /**
   * Present when the merged entries are sorted locally: a property order with no limit or skip, which the working
   * set evaluates over what it holds and the engine applies over the union.
   */
  order?: readonly QueryAST.Order[];
  /** Present when remote traversal hits are revalidated through their derivations. */
  paths?: PathPlan;
  /** Present when a remote's collapsed scalar groups are adjusted by their manifests. */
  manifest?: ManifestPlan;
  /** Present when the query selects from feeds: the selection a feed object with a local write is re-matched against. */
  feed?: { filter: QueryAST.Filter; options: Pick<QueryAST.QueryOptions, 'deleted'> };
  /** Ids a by-id query selects; it is whole once every one is loaded with a body. */
  ids?: readonly EntityId[];
  /**
   * Canonical typenames a written object must carry to affect the query; undefined when any write in scope
   * may. Never narrower than the host's own invalidation, so a staleness it marks is always cleared by a re-run.
   */
  typenames?: ReadonlySet<string>;
  /** Whether a remote answer can go stale on a local write: local evidence does not decide membership alone. */
  staleOnLocalWrite: boolean;
  /**
   * Whether the merged entries sort by id: a single space-scoped type or wildcard selection with no order of
   * its own takes the planner's natural order, which every source answers in.
   */
  natural: boolean;
};

export const createMergePlan = (query: QueryAST.Query): MergePlan => {
  const characteristics = QueryAST.characteristics(query);
  const flat = flatten(query);
  const [branch] = characteristics.branches;
  const single = characteristics.branches.length === 1 ? branch : undefined;

  const revalidate =
    flat && characteristics.revalidation === 'entry'
      ? {
          filter: flat.filters.length === 1 ? flat.filters[0] : { type: 'and' as const, filters: flat.filters },
          deleted: getQueryDeletedOption(query),
        }
      : undefined;

  const window =
    revalidate &&
    flat?.limit !== undefined &&
    flat.skip === undefined &&
    flat.orders.length > 0 &&
    flat.orders.every((order) => order.kind === 'property')
      ? { orders: flat.orders, limit: flat.limit }
      : undefined;

  const ids =
    single?.class === 'local-complete' && single.selection === 'id' && flat
      ? flat.filters.flatMap((filter) => (filter.type === 'object' ? (filter.id ?? []) : []))
      : undefined;

  const order =
    revalidate && flat && flat.limit === undefined && flat.skip === undefined && ordersLocally(flat.orders)
      ? flat.orders
      : undefined;

  const paths =
    single?.revalidation === 'path' && single.window.order === 'none' && single.aggregate === 'none'
      ? pathPlanOf(query, getQueryDeletedOption(query))
      : undefined;

  const manifest =
    single?.aggregate === 'scalar' &&
    single.traversal === 0 &&
    single.predicates === 'local' &&
    single.window.order === 'none' &&
    single.window.limit === undefined &&
    single.window.skip === undefined
      ? aggregatesOf(query)
      : undefined;

  const simple = isSimpleSelectionQuery(query);
  const feed =
    simple && (simple.hasQueues || queryIncludesAllFeeds(query))
      ? { filter: simple.filter, options: { deleted: getQueryDeletedOption(query) } }
      : undefined;

  const windowed = single !== undefined && single.window.order !== 'none' && order === undefined;
  const natural =
    single !== undefined &&
    (single.selection === 'type' || single.selection === 'wildcard') &&
    single.traversal === 0 &&
    single.aggregate === 'none' &&
    !single.scope.feeds &&
    single.scope.registry === 'none' &&
    single.window.order === 'none' &&
    single.window.limit === undefined &&
    single.window.skip === undefined;
  return {
    characteristics,
    revalidate,
    window,
    order,
    paths,
    manifest: manifest && { aggregates: manifest },
    feed,
    ids,
    typenames: flat ? typenamesOf(flat.filters) : undefined,
    staleOnLocalWrite: !revalidate || windowed || flat?.limit !== undefined || flat?.skip !== undefined,
    natural,
  };
};

/**
 * Local evidence on a remote entry: `drop` when it overrules the entry, `verified` when it confirms it, `trusted`
 * when there is none and the entry stands on the remote's word.
 */
export type RemoteVerdict = 'drop' | 'verified' | 'trusted';

/**
 * Judges a remote entry by what is loaded here: a loaded object must still match, every derivation of a traversal
 * hit is re-walked, and an object held at exactly the version the remote evaluated is confirmed without either.
 * Entries judged in one synchronous pass share `memo`, so siblings walk their common ancestors' deletion once.
 */
export const judgeRemoteEntry = (
  plan: MergePlan,
  entry: SourceEntry,
  lookup: CoreLookup,
  feedLocalWrite?: (id: string) => Entity.Unknown | undefined,
  memo?: DeletionMemo,
): RemoteVerdict => {
  if (!isEchoObject(entry.result)) {
    // A feed object with a write the index has not seen is ahead of the answer, so the local state decides.
    const local = plan.feed && feedLocalWrite?.(entry.id);
    if (!plan.feed || !local) {
      return 'trusted';
    }
    return matchesFeedSelection(plan.feed.filter, plan.feed.options, local) ? 'verified' : 'drop';
  }
  const core = getObjectCore(entry.result);
  if (plan.paths) {
    const spaceId = core.entityManager?.spaceId;
    if (!entry.paths || spaceId === undefined) {
      return 'trusted';
    }
    const check = checkPaths(plan.paths, entry.paths, lookup, spaceId);
    return check === 'holds' ? 'verified' : check === 'broken' ? 'drop' : 'trusted';
  }
  if (!plan.revalidate) {
    return 'trusted';
  }
  if (entry.version?.kind === 'automerge' && heldAtVersion(core, entry.version)) {
    return 'verified';
  }
  const verdict = evaluateCore(plan, core, memo);
  return verdict === undefined ? 'trusted' : verdict ? 'verified' : 'drop';
};

/** The heads of the document a loaded core reads, and that document's id; undefined when nothing is loaded. */
export const localVersion = (core: ObjectCore): { documentId: string; heads: readonly string[] } | undefined => {
  const documentId = core.handle?.documentId;
  const heads = core.doc ? A.getHeads(core.doc) : core.handle?.passiveHeads;
  return documentId !== undefined && heads ? { documentId, heads } : undefined;
};

/** Whether the core is held at exactly the version a remote evaluated, so its verdict is the local one too. */
const heldAtVersion = (core: ObjectCore, version: { documentId: string; heads: readonly string[] }): boolean => {
  const local = localVersion(core);
  return (
    local !== undefined &&
    local.documentId === version.documentId &&
    local.heads.length === version.heads.length &&
    local.heads.every((head) => version.heads.includes(head))
  );
};

/** The aggregate clause of a query whose scalar groups a remote collapses; undefined for one with members. */
const aggregatesOf = (query: QueryAST.Query): readonly QueryAST.GroupAggregate[] | undefined => {
  const clauses: (readonly QueryAST.GroupAggregate[])[] = [];
  QueryAST.visit(query, (node) => {
    if (node.type === 'aggregate') {
      clauses.push(node.aggregates);
    }
  });
  const [aggregates] = clauses;
  return clauses.length === 1 && !aggregates.some((aggregate) => aggregate.kind === 'items') ? aggregates : undefined;
};

/** A loaded core's local verdict, or undefined when local cannot evaluate it (no body or no database). */
export const evaluateCore = (plan: MergePlan, core: ObjectCore, memo?: DeletionMemo): boolean | undefined => {
  const structure = core.getObjectStructure();
  const spaceId = core.entityManager?.spaceId;
  if (!plan.revalidate || structure === undefined || spaceId === undefined) {
    return undefined;
  }
  const { filter, deleted } = plan.revalidate;
  const deletedMatches = deleted === 'include' || (deleted === 'only') === core.isDeleted(undefined, memo);
  return deletedMatches && filterMatchDoc(filter, { id: core.id, doc: structure, spaceId });
};

/** Whether a written core can affect the query, by the same typename test the host invalidates with. */
export const writeAffects = (plan: MergePlan, core: ObjectCore | undefined): boolean => {
  if (plan.typenames === undefined) {
    return true;
  }
  const type = core?.getType();
  return type !== undefined && plan.typenames.has(canonicalTypename(EncodedReference.toURI(type)));
};

/** Orders two objects' document data by the window's property orders; missing data compares as missing values. */
export const compareWindowData = (
  orders: readonly QueryAST.Order[],
  left: EntityStructure['data'] | undefined,
  right: EntityStructure['data'] | undefined,
): number => {
  for (const order of orders) {
    if (order.kind !== 'property') {
      continue;
    }
    const comparison = compareOrderValues(getDeep(left, [order.property]), getDeep(right, [order.property]));
    if (comparison !== 0) {
      return order.direction === 'desc' ? -comparison : comparison;
    }
  }
  return 0;
};

/** An entry's local document data, or undefined when its object is not loaded here with a body. */
export const windowData = (entry: SourceEntry): EntityStructure['data'] | undefined =>
  isEchoObject(entry.result) ? getObjectCore(entry.result).getObjectStructure()?.data : undefined;

/** Whether the working set can order by every one of `orders`: by id or by a document property. */
export const ordersLocally = (orders: readonly QueryAST.Order[]): boolean =>
  orders.length > 0 && orders.every((order) => order.kind === 'property' || order.kind === 'natural');

/** Orders two entries by `orders` over their local document data, ids for a natural order. */
export const compareEntries = (
  orders: readonly QueryAST.Order[],
  left: { id: string; data: EntityStructure['data'] | undefined },
  right: { id: string; data: EntityStructure['data'] | undefined },
): number => {
  for (const order of orders) {
    const comparison =
      order.kind === 'natural'
        ? left.id < right.id
          ? -1
          : left.id > right.id
            ? 1
            : 0
        : order.kind === 'property'
          ? compareOrderValues(getDeep(left.data, [order.property]), getDeep(right.data, [order.property]))
          : 0;
    if (comparison !== 0) {
      return order.direction === 'desc' ? -comparison : comparison;
    }
  }
  return 0;
};

/** Whether a feed object matches a simple selection, deleted option included. */
export const matchesFeedSelection = (
  filter: QueryAST.Filter,
  options: Pick<QueryAST.QueryOptions, 'deleted'> | undefined,
  object: Entity.Unknown,
): boolean => {
  const deleted = Entity.isDeleted(object);
  const deletedMatches = options?.deleted === 'include' || (options?.deleted === 'only' ? deleted : !deleted);
  return deletedMatches && filterMatchEntity(filter, object);
};

/** Version-less typename, as the host keys invalidation (`echo-host` `canonicalTypename`). */
const canonicalTypename = (uri: string): string => {
  const dxn = DXN.tryMake(uri);
  return dxn != null ? DXN.getName(dxn) : uri;
};

type FlatQuery = {
  filters: QueryAST.Filter[];
  orders: readonly QueryAST.Order[];
  limit?: number;
  skip?: number;
};

/**
 * Reads a single-branch query as filters plus an optional window; null for any other shape. The order must
 * sit inside the limit (`orderBy(...).limit(n)`), since a limit applied before ordering is not a window.
 */
const flatten = (query: QueryAST.Query): FlatQuery | null => {
  const filters: QueryAST.Filter[] = [];
  let orders: readonly QueryAST.Order[] = [];
  let limit: number | undefined;
  let skip: number | undefined;
  let node: QueryAST.Query = query;
  for (;;) {
    switch (node.type) {
      case 'select':
        filters.push(node.filter);
        return { filters, orders, limit, skip };
      case 'filter':
        filters.push(node.filter);
        node = node.selection;
        break;
      case 'options':
        node = node.query;
        break;
      case 'order':
        if (orders.length > 0) {
          return null;
        }
        orders = node.order;
        node = node.query;
        break;
      case 'limit':
        if (limit !== undefined || orders.length > 0) {
          return null;
        }
        limit = node.limit;
        node = node.query;
        break;
      case 'skip':
        if (skip !== undefined || orders.length > 0) {
          return null;
        }
        skip = node.skip;
        node = node.query;
        break;
      case 'from':
        if (node.from._tag !== 'scope') {
          return null;
        }
        node = node.query;
        break;
      default:
        return null;
    }
  }
};

const typenamesOf = (filters: readonly QueryAST.Filter[]): ReadonlySet<string> | undefined => {
  for (const filter of filters) {
    const conjuncts = filter.type === 'and' ? filter.filters : [filter];
    const typed = conjuncts.find(
      (conjunct): conjunct is QueryAST.FilterObject => conjunct.type === 'object' && conjunct.typename !== null,
    );
    if (typed?.typename) {
      return new Set([canonicalTypename(typed.typename)]);
    }
  }
  return undefined;
};
