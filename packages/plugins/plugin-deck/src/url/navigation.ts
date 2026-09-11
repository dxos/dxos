//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { EntityId } from '@dxos/keys';

/**
 * What is open, as the URL says it: a workspace and an ordered chain of pairs. `known` carries the node
 * id an in-app navigation already holds for a pair's segment, so the projection can open the plank
 * under it at once rather than under a placeholder it later swaps for the resolved id — a swap that
 * re-keys the plank and remounts everything in it, its companion included.
 */
export type Navigation = {
  workspace: string;
  pairs: readonly UrlPath.Pair[];
  known?: ReadonlyMap<PlankSegment, string>;
};

/**
 * A pair as it appears in a plank list, in its URL segment form (`doc/<id>`, `home`). Branded so a
 * plank id cannot be passed where a segment belongs: the two are the same shape and are routinely
 * held side by side.
 */
export type PlankSegment = string & { readonly [PlankSegmentBrand]: true };
declare const PlankSegmentBrand: unique symbol;

/**
 * The URL segment each open plank came from, keyed by plank id. Stored unbranded, since it is
 * persisted state; {@link segmentOf} is the way to read it.
 */
export type PlankSegments = Record<string, string>;

/**
 * An open plank: the id it is rendered and attended by, and the URL segment it came from. The
 * segment is absent only for a plank the URL did not name, which is the not-found sentinel.
 */
export type Plank = { id: string; segment?: PlankSegment };

/**
 * The segment a plank occupies. Falls back to the id for a deck whose segments were never recorded,
 * which is every write that did not come from the URL projection.
 */
export const segmentOf = (segments: PlankSegments | undefined, id: string): PlankSegment =>
  (segments?.[id] ?? id) as PlankSegment;

/** The segment a pair occupies. */
export const toSegment = (pair: UrlPath.Pair): PlankSegment =>
  (pair.id === undefined ? pair.key : `${pair.key}/${pair.id}`) as PlankSegment;

/** Reverse of {@link toSegment}, against a workspace the caller already knows. */
export const fromSegment = (segment: string, workspace: string): UrlPath.Pair => {
  const separator = segment.indexOf('/');
  return separator === -1
    ? { key: segment, workspace }
    : { key: segment.slice(0, separator), id: segment.slice(separator + 1), workspace };
};

/** Serialize to a pathname. */
export const format = ({ workspace, pairs }: Navigation): string =>
  UrlPath.format({ workspace, workspaceKey: UrlPath.WORKSPACE_KEY, pairs: [...pairs] });

/**
 * Parse a pathname, which needs the key table to know which keys carry an id. `Option.none()` for a
 * pathname the table cannot yet tokenize; callers retry as builders register.
 */
export const parse = (pathname: string, table: UrlPath.KeyTable): Option.Option<Navigation> =>
  UrlPath.parse(pathname, table).pipe(Option.map(({ workspace, pairs }) => ({ workspace, pairs })));

/**
 * Write a navigation to the address bar, and report whether it changed. The caller is responsible
 * for projecting the new URL into deck state.
 */
export const push = (next: Navigation, method: 'push' | 'replace' = 'push'): boolean => {
  const url = `${format(next)}${window.location.search}`;
  if (`${window.location.pathname}${window.location.search}` === url) {
    return false;
  }
  if (method === 'replace') {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  return true;
};

/** The URL segment a node occupies, or `undefined` when it has none and so cannot be a plank. */
export const segmentForNode = (builder: AppGraphBuilder.GraphBuilder, nodeId: string): PlankSegment | undefined =>
  Option.match(PathResolution.representNode(builder, nodeId), { onNone: () => undefined, onSome: toSegment });

/**
 * Every ECHO object id a URL pair's `id` field could be referring to, in the order they appear.
 *
 * Which `+`-joined segment holds the object id is extension-specific — `<objectId>+<view>` for a
 * mailbox's filter views, `<typeSlug>+<objectId>` for a database object — and the position is
 * declared nowhere, so no single index is correct. A `SpaceId` cannot be mistaken for an object id
 * (33-char multibase vs 26-char ULID).
 */
export const getCandidateEntityIds = (pairId: string, tailSeparator: string): string[] =>
  pairId.split(tailSeparator).filter((segment) => EntityId.isValid(segment));

/** The plank id for a pair no extension could resolve. */
export const getUnresolvedPlankId = (pair: UrlPath.Pair): string =>
  [GraphPath.getSpacePath(pair.workspace), pair.key, pair.id].filter((segment) => segment !== undefined).join('/');

/**
 * The planks a chain opens before it resolves: each pair under the id `known` holds for its segment,
 * else under a placeholder the resolved id replaces. Companion pairs open nothing of their own.
 */
export const initialPlanks = (pairs: readonly UrlPath.Pair[], known: ReadonlyMap<PlankSegment, string>): Plank[] =>
  pairs
    .filter((pair) => pair.key !== UrlPath.COMPANION_KEY)
    .map((pair) => {
      const segment = toSegment(pair);
      return { segment, id: known.get(segment) ?? getUnresolvedPlankId(pair) };
    });
