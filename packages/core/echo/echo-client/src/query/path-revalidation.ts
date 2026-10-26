//
// Copyright 2026 DXOS.org
//

import { filterMatchDoc } from '@dxos/echo-host/filter';
import { EncodedReference, EntityStructure, EscapedPropPath, type QueryAST } from '@dxos/echo-protocol';
import { EID, type SpaceId } from '@dxos/keys';
import { type QueryService } from '@dxos/protocols/rpc';
import { getDeep } from '@dxos/util';

import { type ObjectCore } from '../core-db/index.ts';

/**
 * The filters of a linear traversal chain, one entry per level: the anchor's at 0, then the filters applied
 * to what each hop reached. A remote traversal hit is revalidated by walking its derivations against them.
 */
export type PathPlan = {
  levels: readonly (QueryAST.Filter | undefined)[];
  deleted: 'exclude' | 'include' | 'only';
};

/** The local evidence a path check reads: a loaded object's core, and its document's heads. */
export type CoreLookup = (id: string) => { core: ObjectCore; heads: readonly string[] | undefined } | undefined;

/**
 * Reads a query as a linear traversal chain; undefined for any other shape (a union, a window, an aggregate,
 * a subquery), whose hits are left unverified.
 */
export const pathPlanOf = (query: QueryAST.Query, deleted: PathPlan['deleted']): PathPlan | undefined => {
  const levels = chainOf(query);
  return levels && levels.length > 1 ? { levels: levels.map(conjoin), deleted } : undefined;
};

const chainOf = (node: QueryAST.Query): QueryAST.Filter[][] | undefined => {
  switch (node.type) {
    case 'select':
      return [[node.filter]];
    case 'filter': {
      const levels = chainOf(node.selection);
      return levels && [...levels.slice(0, -1), [...levels[levels.length - 1], node.filter]];
    }
    case 'options':
      return chainOf(node.query);
    case 'from':
      return node.from._tag === 'scope' ? chainOf(node.query) : undefined;
    case 'reference-traversal':
    case 'incoming-references':
    case 'relation-traversal':
    case 'hierarchy-traversal': {
      const levels = chainOf(node.anchor);
      return levels && [...levels, []];
    }
    case 'relation': {
      const levels = chainOf(node.anchor);
      return levels && [...levels, node.filter ? [node.filter] : []];
    }
    default:
      return undefined;
  }
};

const conjoin = (filters: readonly QueryAST.Filter[]): QueryAST.Filter | undefined =>
  filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { type: 'and', filters: [...filters] };

/** What local evidence says of one derivation, or of one level or edge of it. */
export type PathCheck = 'holds' | 'broken' | 'unknown';

/**
 * What the derivations of a remote traversal hit say against what is loaded here: `holds` when some
 * derivation is confirmed at every level and edge, `broken` when every derivation is contradicted, and
 * `unknown` otherwise. An object or holder that is not loaded can neither confirm nor contradict.
 */
export const checkPaths = (
  plan: PathPlan,
  paths: readonly (readonly QueryService.PathEdge[])[],
  lookup: CoreLookup,
  spaceId: SpaceId,
): PathCheck => {
  const checks = paths.map((path) => checkPath(plan, path, lookup, spaceId));
  return checks.includes('holds')
    ? 'holds'
    : checks.length > 0 && checks.every((check) => check === 'broken')
      ? 'broken'
      : 'unknown';
};

const checkPath = (
  plan: PathPlan,
  path: readonly QueryService.PathEdge[],
  lookup: CoreLookup,
  spaceId: SpaceId,
): PathCheck => {
  if (path.length === 0 || path.length !== plan.levels.length - 1) {
    // A path that does not match the chain was produced for another plan; it proves nothing either way.
    return 'unknown';
  }
  const checks: PathCheck[] = [];
  for (const [hop, edge] of path.entries()) {
    checks.push(checkLevel(plan, hop, edge.from, lookup, spaceId), checkEdge(edge, lookup));
  }
  checks.push(checkLevel(plan, path.length, path[path.length - 1].to, lookup, spaceId));
  return checks.includes('broken') ? 'broken' : checks.every((check) => check === 'holds') ? 'holds' : 'unknown';
};

const checkLevel = (plan: PathPlan, level: number, id: string, lookup: CoreLookup, spaceId: SpaceId): PathCheck => {
  const local = lookup(id);
  const structure = local?.core.getObjectStructure();
  if (!local || structure === undefined) {
    return 'unknown';
  }
  // Every hop excludes deleted objects; only the hit itself answers to the query's own deleted option.
  const deleted = level === plan.levels.length - 1 ? plan.deleted : 'exclude';
  if (deleted !== 'include' && (deleted === 'only') !== local.core.isDeleted()) {
    return 'broken';
  }
  const filter = plan.levels[level];
  return filter === undefined || filterMatchDoc(filter, { id, doc: structure, spaceId }) ? 'holds' : 'broken';
};

const checkEdge = (edge: QueryService.PathEdge, lookup: CoreLookup): PathCheck => {
  const holder = lookup(edge.holder);
  const structure = holder?.core.getObjectStructure();
  if (!holder || structure === undefined) {
    return 'unknown';
  }
  if (edge.holderHeads && holder.heads && sameHeads(edge.holderHeads, holder.heads)) {
    return 'holds';
  }
  // The endpoint the holder's document names: the one that is not the holder itself.
  const other = edge.holder === edge.from ? edge.to : edge.from;
  const recorded = (() => {
    switch (edge.kind) {
      case 'ref':
      case 'incoming-ref':
        return edge.property !== undefined && referencesAt(structure, edge.property, other);
      case 'relation-source':
        return refersTo(EntityStructure.getRelationSource(structure), other);
      case 'relation-target':
        return refersTo(EntityStructure.getRelationTarget(structure), other);
      case 'parent':
      case 'child':
        return refersTo(EntityStructure.getParent(structure), other);
    }
  })();
  return recorded ? 'holds' : 'broken';
};

/** Whether the property at `escapedPath` holds a reference to `id`, directly or in an array. */
const referencesAt = (structure: EntityStructure, escapedPath: string, id: string): boolean => {
  const value = getDeep(structure.data, EscapedPropPath.unescape(escapedPath));
  return (Array.isArray(value) ? value : [value]).some((item) => refersTo(item, id));
};

const refersTo = (value: unknown, id: string): boolean => {
  if (!EncodedReference.isEncodedReference(value)) {
    return false;
  }
  const eid = EID.tryParse(EncodedReference.toURI(value));
  return eid !== undefined && EID.getEntityId(eid) === id;
};

const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));
