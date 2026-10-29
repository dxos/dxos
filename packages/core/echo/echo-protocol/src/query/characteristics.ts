//
// Copyright 2026 DXOS.org
//

import type * as QueryAST from './ast.ts';

/**
 * How much of a branch the in-process sources can answer, weakest last:
 * - `local-complete`: the in-process sources hold the whole answer (a by-id lookup, a local registry scope).
 * - `local-partial`: the working set answers the part it holds; a remote completes it.
 * - `local-revalidating`: a remote is authoritative; local evidence can only drop or admit entries.
 * - `remote-only`: nothing in-process can contribute.
 * - `unsupported`: no source serves this shape.
 */
export type QueryClass = 'local-complete' | 'local-partial' | 'local-revalidating' | 'remote-only' | 'unsupported';

/** What a remote entry must carry for local evidence to overrule it. */
export type Revalidation = 'entry' | 'path' | 'manifest' | 'none';

export type SelectionKind =
  | 'id'
  | 'type'
  | 'wildcard'
  | 'text'
  | 'timestamp'
  | 'changes'
  | 'feed-cursor'
  | 'incoming-ref';

export type QueryWindow = {
  /** `local-property` and `natural` orders are computable over the working set; `index` orders are not. */
  order: 'none' | 'natural' | 'local-property' | 'index';
  limit?: number;
  skip?: number;
};

export type BranchCharacteristics = {
  class: QueryClass;
  revalidation: Revalidation;
  selection: SelectionKind;
  /** `index` when any node of the filter tree cannot be evaluated against a single document. */
  predicates: 'local' | 'index';
  /** Traversal hops, `child-of` counting as one. */
  traversal: number;
  window: QueryWindow;
  aggregate: 'none' | 'members' | 'scalar' | 'index';
  scope: { space: boolean; feeds: boolean; registry: 'none' | 'local' | 'remote' };
};

export type Characteristics = {
  /** One record per union member; wrappers above a union apply to each member. */
  branches: BranchCharacteristics[];
  /** Some branch has an in-process contribution available before any remote answers. */
  synchronous: boolean;
  /** Some branch is served, in whole or in part, by a remote source. */
  remote: boolean;
  /** The single branch's revalidation; `none` for a multi-branch query, whose entries are not attributed to a branch. */
  revalidation: Revalidation;
};

type Accumulator = {
  selection: SelectionKind;
  predicates: 'local' | 'index';
  traversal: number;
  subquery: boolean;
  setDifference: boolean;
  window: QueryWindow;
  aggregate: BranchCharacteristics['aggregate'];
  scopes: readonly QueryAST.Scope[] | undefined;
};

const initial = (): Accumulator => ({
  selection: 'wildcard',
  predicates: 'local',
  traversal: 0,
  subquery: false,
  setDifference: false,
  window: { order: 'none' },
  aggregate: 'none',
  scopes: undefined,
});

/**
 * Classifies a query from its AST alone: which branches the in-process sources can answer, and what a
 * remote entry must carry for local evidence to overrule it.
 */
export const characteristics = (query: QueryAST.Query): Characteristics => {
  const branches = collect(query, initial()).map(finish);
  return {
    branches,
    synchronous: branches.some((branch) => branch.class === 'local-complete' || branch.class === 'local-partial'),
    remote: branches.some((branch) => branch.class !== 'unsupported' && (branch.scope.space || branch.scope.feeds)),
    revalidation: branches.length === 1 ? branches[0].revalidation : 'none',
  };
};

const collect = (node: QueryAST.Query, acc: Accumulator): Accumulator[] => {
  switch (node.type) {
    case 'select':
      return [applySelection(node.filter, acc)];
    case 'filter':
      return collect(node.selection, { ...acc, predicates: worstPredicates(acc.predicates, node.filter) }).map(
        (branch) => ({ ...branch, traversal: branch.traversal + countChildOf(node.filter) }),
      );
    case 'reference-traversal':
    case 'relation':
    case 'relation-traversal':
    case 'hierarchy-traversal':
      return collect(node.anchor, acc).map((branch) => ({ ...branch, traversal: branch.traversal + 1 }));
    case 'incoming-references':
      return collect(node.anchor, acc).map((branch) => ({
        ...branch,
        traversal: branch.traversal + 1,
        selection: 'incoming-ref' as const,
      }));
    case 'union':
      return node.queries.flatMap((member) => collect(member, acc));
    case 'set-difference':
      return collect(node.source, { ...acc, setDifference: true });
    case 'order':
      return collect(node.query, { ...acc, window: { ...acc.window, order: windowOrder(node.order) } });
    case 'limit':
      return collect(node.query, { ...acc, window: { ...acc.window, limit: node.limit } });
    case 'skip':
      return collect(node.query, { ...acc, window: { ...acc.window, skip: node.skip } });
    case 'options':
      return collect(node.query, acc);
    case 'aggregate':
      return collect(node.query, { ...acc, aggregate: aggregateKind(node.aggregates) });
    case 'from':
      if (node.from._tag === 'scope') {
        return collect(node.query, { ...acc, scopes: node.from.scopes });
      }
      return collect(node.query, { ...acc, subquery: true });
  }
};

const applySelection = (filter: QueryAST.Filter, acc: Accumulator): Accumulator => ({
  ...acc,
  selection: selectionOf(filter),
  predicates: worstPredicates(acc.predicates, filter),
  traversal: acc.traversal + countChildOf(filter),
});

const finish = (acc: Accumulator): BranchCharacteristics => {
  const scope = scopeOf(acc.scopes);
  const branch: Omit<BranchCharacteristics, 'class' | 'revalidation'> = {
    selection: acc.selection,
    predicates: acc.predicates,
    traversal: acc.traversal,
    window: acc.window,
    aggregate: acc.aggregate,
    scope,
  };

  // The registry source answers simple selections only, matched in memory over its entries.
  if (!scope.space && !scope.feeds) {
    const simple =
      acc.traversal === 0 &&
      acc.aggregate === 'none' &&
      acc.window.order === 'none' &&
      acc.window.limit === undefined &&
      acc.window.skip === undefined &&
      acc.predicates === 'local' &&
      !acc.subquery &&
      !acc.setDifference;
    return {
      ...branch,
      class: scope.registry === 'local' && simple ? 'local-complete' : 'unsupported',
      revalidation: 'none',
    };
  }

  // A feed's unacknowledged writes are in the working set, so a simple selection over feeds has a local part.
  const simpleFeedSelection =
    acc.traversal === 0 &&
    acc.aggregate === 'none' &&
    acc.window.order === 'none' &&
    acc.window.limit === undefined &&
    acc.window.skip === undefined &&
    !acc.subquery &&
    !acc.setDifference;
  const remoteOnly =
    (scope.feeds && !simpleFeedSelection) ||
    acc.predicates === 'index' ||
    acc.aggregate === 'index' ||
    acc.selection === 'text' ||
    acc.selection === 'timestamp' ||
    acc.selection === 'changes' ||
    acc.selection === 'feed-cursor';
  if (remoteOnly) {
    return { ...branch, class: 'remote-only', revalidation: 'none' };
  }

  // An order the working set can apply over the merged entries is not a window; a slice, or an order by index
  // data, is the remote's to define.
  const windowed = acc.window.order === 'index' || acc.window.limit !== undefined || acc.window.skip !== undefined;
  const queryClass: QueryClass =
    windowed || acc.setDifference
      ? 'local-revalidating'
      : acc.selection === 'id' && acc.traversal === 0 && acc.aggregate === 'none' && !acc.subquery && !scope.feeds
        ? 'local-complete'
        : 'local-partial';

  const revalidation: Revalidation =
    acc.aggregate !== 'none'
      ? 'manifest'
      : acc.traversal > 0
        ? 'path'
        : acc.subquery || acc.setDifference
          ? 'none'
          : 'entry';

  return { ...branch, class: queryClass, revalidation };
};

const scopeOf = (scopes: readonly QueryAST.Scope[] | undefined): BranchCharacteristics['scope'] => {
  // No explicit scope targets the owning space.
  if (scopes === undefined || scopes.length === 0) {
    return { space: true, feeds: false, registry: 'none' };
  }
  const registry = scopes.find((scope): scope is QueryAST.RegistryScope => scope._tag === 'registry');
  return {
    space: scopes.some((scope) => scope._tag === 'space'),
    // A space scope that includes all feeds leaks feed items into the branch, which the working set does not hold.
    feeds: scopes.some((scope) => scope._tag === 'feed' || (scope._tag === 'space' && scope.includeAllFeeds === true)),
    registry: registry?.location ?? 'none',
  };
};

const windowOrder = (orders: readonly QueryAST.Order[]): QueryWindow['order'] => {
  let result: QueryWindow['order'] = 'none';
  for (const order of orders) {
    const kind = order.kind === 'natural' ? 'natural' : order.kind === 'property' ? 'local-property' : 'index';
    result = rank(kind) > rank(result) ? kind : result;
  }
  return result;
};

const rank = (order: QueryWindow['order']): number => ['none', 'natural', 'local-property', 'index'].indexOf(order);

const aggregateKind = (aggregates: readonly QueryAST.GroupAggregate[]): BranchCharacteristics['aggregate'] => {
  if (aggregates.some((aggregate) => aggregate.kind === 'timestamp')) {
    return 'index';
  }
  return aggregates.some((aggregate) => aggregate.kind === 'items') ? 'members' : 'scalar';
};

const selectionOf = (filter: QueryAST.Filter): SelectionKind => {
  const kinds = filterKinds(filter);
  for (const kind of ['text-search', 'timestamp', 'changes', 'feed-cursor'] as const) {
    if (kinds.has(kind)) {
      return kind === 'text-search' ? 'text' : kind;
    }
  }
  if (filter.type === 'object' && filter.id !== undefined && filter.id.length > 0) {
    return 'id';
  }
  const conjuncts = filter.type === 'and' ? filter.filters : [filter];
  return conjuncts.some((conjunct) => conjunct.type === 'object' && conjunct.typename !== null) ? 'type' : 'wildcard';
};

// `filterMatchDoc` throws on the executor-level filters and answers `false` for text search, so a node of
// any of these kinds anywhere in the tree makes a single-document verdict unsound.
const INDEX_FILTERS = new Set<QueryAST.Filter['type']>([
  'text-search',
  'timestamp',
  'changes',
  'feed-cursor',
  'in-query',
]);

const worstPredicates = (current: 'local' | 'index', filter: QueryAST.Filter): 'local' | 'index' => {
  if (current === 'index') {
    return current;
  }
  for (const kind of filterKinds(filter)) {
    if (INDEX_FILTERS.has(kind)) {
      return 'index';
    }
  }
  return 'local';
};

const countChildOf = (filter: QueryAST.Filter): number => {
  let count = 0;
  visitFilter(filter, (node) => {
    if (node.type === 'child-of') {
      count++;
    }
  });
  return count;
};

const filterKinds = (filter: QueryAST.Filter): Set<QueryAST.Filter['type']> => {
  const kinds = new Set<QueryAST.Filter['type']>();
  visitFilter(filter, (node) => kinds.add(node.type));
  return kinds;
};

const visitFilter = (filter: QueryAST.Filter, visitor: (node: QueryAST.Filter) => void): void => {
  visitor(filter);
  switch (filter.type) {
    case 'and':
    case 'or':
      filter.filters.forEach((child) => visitFilter(child, visitor));
      break;
    case 'not':
      visitFilter(filter.filter, visitor);
      break;
    case 'object':
      Object.values(filter.props).forEach((child) => visitFilter(child, visitor));
      break;
    default:
      break;
  }
};
