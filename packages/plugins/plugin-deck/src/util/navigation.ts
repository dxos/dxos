//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';

/**
 * What is open, as the URL says it: a workspace and an ordered chain of pairs. The deck's source of
 * truth. Node ids are derived from this, never the other way around.
 */
export type Navigation = {
  workspace: string;
  pairs: readonly UrlPath.Pair[];
};

/** A pair as it appears in a plank list, in its URL segment form (`doc/<id>`, `home`). */
export type PlankSegment = string;

/** The segment a pair occupies, which is also how a plank is identified. */
export const toSegment = (pair: UrlPath.Pair): PlankSegment =>
  pair.id === undefined ? pair.key : `${pair.key}/${pair.id}`;

/** Reverse of {@link toSegment}, against a workspace the caller already knows. */
export const fromSegment = (segment: PlankSegment, workspace: string): UrlPath.Pair => {
  const separator = segment.indexOf('/');
  return separator === -1
    ? { key: segment, workspace }
    : { key: segment.slice(0, separator), id: segment.slice(separator + 1), workspace };
};

/** Serialize to a pathname. Total: every navigation has a URL. */
export const format = ({ workspace, pairs }: Navigation): string =>
  UrlPath.format({ workspace, workspaceKey: UrlPath.WORKSPACE_KEY, pairs: [...pairs] });

/**
 * Parse a pathname, which needs the key table to know which keys carry an id. `Option.none()` for a
 * pathname the table cannot yet tokenize, which is a keys-not-registered-yet answer rather than a
 * malformed-URL one; callers retry as builders register.
 */
export const parse = (pathname: string, table: UrlPath.KeyTable): Option.Option<Navigation> =>
  UrlPath.parse(pathname, table).pipe(Option.map(({ workspace, pairs }) => ({ workspace, pairs })));

/**
 * Write a navigation to the address bar, and report whether it changed. Pushing is all this does:
 * the caller is responsible for projecting the new URL into deck state, so that a push and a
 * traversal reach that projection by the same function rather than by two paths.
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

/**
 * The URL segment a node occupies, or `undefined` when it has none.
 *
 * Read through the node's provenance, the same way the URL itself is written, so a segment from here
 * and the segment the deck ends up holding for that plank are the same string. A node with no segment
 * is not addressable and therefore cannot be a plank.
 */
export const segmentForNode = (builder: AppGraphBuilder.GraphBuilder, nodeId: string): PlankSegment | undefined =>
  Option.match(PathResolution.representNode(builder, nodeId), { onNone: () => undefined, onSome: toSegment });
