//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Graph, GraphBuilder, Node, PathResolution } from '@dxos/app-graph';
import { Filter, Key, Query, Scope } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { expandAttendableId } from '@dxos/react-ui-attention/types';

import * as Paths from './Paths';
import * as UrlPath from './UrlPath';

export const NOT_FOUND_NODE_ID = 'not-found';

/**
 * Canonical qualified path for the not-found sentinel node.
 * Navigation resolvers return this when a target does not exist.
 */
export const NOT_FOUND_PATH = `${Node.RootId}/${NOT_FOUND_NODE_ID}`;

export const NOT_FOUND_NODE_TYPE = 'org.dxos.type.not-found';

/**
 * Callback to check whether the object identified by an EID exists in some store (local or remote).
 * Returns an Effect resolving to true if the object exists there.
 */
export type ExistenceChecker = (echoUri: EID.EID) => Effect.Effect<boolean>;

/**
 * Expand a qualified graph path by expanding each ancestor prefix.
 * This triggers graph connectors to populate child nodes at each level.
 */
export const expandPath = (graph: Graph.ExpandableGraph, qualifiedId: string): void => {
  const prefixes = expandAttendableId(qualifiedId);
  for (const prefix of prefixes) {
    Graph.expand(graph, prefix, 'child');
  }
};

/**
 * Validate a navigation target by expanding the graph path and checking existence.
 * Returns the original subjectId if valid, or NOT_FOUND_PATH if the target doesn't exist.
 *
 * Resolution is three independent steps: `Paths.tryGetEid` parses the path into an EID (structure
 * only — it does not validate the full container path), then existence is checked against that EID
 * locally and, failing that, remotely. The path is considered valid if the object exists in either
 * store — we render it best-effort even if intermediate path segments (collection, feed, etc.) no
 * longer describe where it lives. If the path doesn't parse to an EID, it's a 404. When no existence
 * checker is available, a resolved EID is trusted.
 */
export const validateNavigationTarget = (params: {
  graph: Graph.ExpandableGraph;
  subjectId: string;
  checkLocalExistence?: ExistenceChecker;
  checkRemoteExistence?: ExistenceChecker;
}): Effect.Effect<string> => {
  const { graph, subjectId, checkLocalExistence, checkRemoteExistence } = params;

  // Skip validation for system paths.
  if (subjectId === NOT_FOUND_PATH || subjectId === Node.RootId || Paths.isPinnedWorkspace(subjectId)) {
    return Effect.succeed(subjectId);
  }

  // Expand the graph path to trigger loading.
  expandPath(graph, subjectId);

  // Fast path: the object is already a node in the local graph.
  const nodeAfterExpand = Graph.getNode(graph, subjectId);
  if (Option.isSome(nodeAfterExpand)) {
    return Effect.succeed(subjectId);
  }

  return Effect.gen(function* () {
    // Parse the path into an EID. If it doesn't parse, there's nothing to open.
    const id = Paths.tryGetEid(graph, subjectId);
    if (Option.isNone(id)) {
      return NOT_FOUND_PATH;
    }

    // Check existence cheapest-first: local (fast) then remote (network, only when not local).
    // Local existence alone is sufficient — an object present locally is valid even if it hasn't
    // replicated to edge; remote existence rescues objects that exist remotely but not yet locally.
    const exists = (checker?: ExistenceChecker) =>
      checker
        ? checker(id.value).pipe(
            Effect.catchAll((error) => {
              log.warn('existence check failed', { subjectId, error });
              return Effect.succeed(false);
            }),
          )
        : Effect.succeed(false);

    if (yield* exists(checkLocalExistence)) {
      return subjectId;
    }
    if (yield* exists(checkRemoteExistence)) {
      return subjectId;
    }

    // With no checkers available we cannot confirm existence; trust the resolved path.
    if (!checkLocalExistence && !checkRemoteExistence) {
      return subjectId;
    }

    return NOT_FOUND_PATH;
  });
};

/**
 * Resolve a browser pathname under the pair-chain URL grammar (`UrlPath`) to a graph node id, for
 * in-app internal-link click-through (e.g. plugin-markdown's internal markdown links) where only a
 * pathname is on hand rather than an already-parsed pair chain. Only the first plank (id-bearing)
 * pair is resolved — a link always targets a single node, so anything past it (a companion pair, or
 * a second plank copied from a shared deck link) is ignored. Returns `Option.none()` for a pathname
 * that doesn't parse under the grammar, or whose target pair doesn't resolve to an existing node.
 */
export const resolveInternalLink = (
  builder: GraphBuilder.GraphBuilder,
  pathname: string,
): Effect.Effect<Option.Option<string>> =>
  Effect.gen(function* () {
    const keyTable = PathResolution.buildUrlKeyTable(builder);
    const parsed = UrlPath.parse(pathname, keyTable);
    if (Option.isNone(parsed)) {
      return Option.none();
    }

    const { workspace, pairs } = parsed.value;
    const plankPair = pairs.find((pair) => pair.id !== undefined);
    if (!plankPair) {
      return Option.none();
    }

    const resolved = yield* PathResolution.resolveUrl(builder, { workspace, pairs: [plankPair] });
    return Option.fromNullable(resolved[0]?.nodeId);
  });

/**
 * Create an ExistenceChecker backed by an edge execQuery function (remote existence).
 * The execQuery parameter should match the EdgeHttpClient.execQuery signature.
 */
export const createEdgeExistenceChecker = (
  execQuery: (spaceId: Key.SpaceId, body: { query: string; reactivity: number }) => Promise<{ results?: unknown[] }>,
): ExistenceChecker => {
  return (echoUri) => {
    const spaceId = EID.getSpaceId(echoUri);
    const objectId = EID.getEntityId(echoUri);
    if (!spaceId || !objectId) {
      return Effect.succeed(false);
    }
    const queryAst = Query.select(Filter.id(objectId)).from(Scope.space({ id: spaceId })).ast;
    return Effect.tryPromise(() =>
      execQuery(spaceId, {
        query: JSON.stringify(queryAst),
        reactivity: 0,
      }),
    ).pipe(
      Effect.map((response) => (response.results?.length ?? 0) > 0),
      Effect.catchAll(() => Effect.succeed(false)),
    );
  };
};
