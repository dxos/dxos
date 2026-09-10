//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';

/** What is open, as the URL says it: a workspace and an ordered chain of pairs. */
export type Navigation = {
  workspace: string;
  pairs: readonly UrlPath.Pair[];
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
