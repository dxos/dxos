//
// Copyright 2026 DXOS.org
//

import { filterMatchDoc } from '@dxos/echo-host/filter';
import { EncodedReference, type EntityStructure, QueryAST } from '@dxos/echo-protocol';
import { DXN, type EntityId } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import { type ObjectCore } from '../core-db/index.ts';
import { getObjectCore, isEchoObject } from '../echo-handler/index.ts';
import { type SourceEntry } from './query-context.ts';
import { getQueryDeletedOption } from './util.ts';
import { compareOrderValues } from './working-set-executor.ts';

/**
 * How the local engine merges in-process results with remote answers for one query, derived once from its
 * AST. See `docs/SYNC_QUERIES.md` §3.1–§3.4.
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
  /** Ids a by-id query selects; it is whole once every one is loaded with a body. */
  ids?: readonly EntityId[];
  /**
   * Canonical typenames a written object must carry to affect the query; undefined when any write in scope
   * may. Never narrower than the host's own invalidation, so a staleness it marks is always cleared by a re-run.
   */
  typenames?: ReadonlySet<string>;
  /** Whether a remote answer can go stale on a local write: local evidence does not decide membership alone. */
  staleOnLocalWrite: boolean;
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

  const windowed = single !== undefined && single.window.order !== 'none';
  return {
    characteristics,
    revalidate,
    window,
    ids,
    typenames: flat ? typenamesOf(flat.filters) : undefined,
    staleOnLocalWrite: !revalidate || windowed || flat?.limit !== undefined || flat?.skip !== undefined,
  };
};

/** Whether local evidence keeps a remote entry: a loaded object must still match; anything else stands. */
export const keepRemoteEntry = (plan: MergePlan, entry: SourceEntry): boolean => {
  if (!plan.revalidate || !isEchoObject(entry.result)) {
    return true;
  }
  const core = getObjectCore(entry.result);
  return evaluateCore(plan, core) ?? true;
};

/** A loaded core's local verdict, or undefined when local cannot evaluate it (no body or no database). */
export const evaluateCore = (plan: MergePlan, core: ObjectCore): boolean | undefined => {
  const structure = core.getObjectStructure();
  const spaceId = core.entityManager?.spaceId;
  if (!plan.revalidate || structure === undefined || spaceId === undefined) {
    return undefined;
  }
  const { filter, deleted } = plan.revalidate;
  const deletedMatches = deleted === 'include' || (deleted === 'only') === core.isDeleted();
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
