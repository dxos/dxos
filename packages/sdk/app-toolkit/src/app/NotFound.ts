//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import { Filter, Key, Query, Scope } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { Attention } from '@dxos/react-ui-attention/types';

import * as GraphPath from './GraphPath';

export const NOT_FOUND_NODE_ID = 'not-found';

/**
 * Canonical qualified path for the not-found sentinel node.
 * Navigation resolvers return this when a target does not exist.
 */
export const NOT_FOUND_PATH = `${GraphNode.RootId}/${NOT_FOUND_NODE_ID}`;

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
export const expandPath = (graph: AppGraph.ExpandableGraph, qualifiedId: string): void => {
  const prefixes = Attention.expandAttendableId(qualifiedId);
  for (const prefix of prefixes) {
    AppGraph.expandSync(graph, prefix, 'child');
  }
};

/**
 * Validate a navigation target by expanding the graph path and checking existence.
 * Returns the original subjectId if valid, or NOT_FOUND_PATH if the target doesn't exist.
 *
 * Resolution is three independent steps: `GraphPath.tryGetEid` parses the path into an EID (structure
 * only — it does not validate the full container path), then existence is checked against that EID
 * locally and, failing that, remotely. The path is considered valid if the object exists in either
 * store — we render it best-effort even if intermediate path segments (collection, feed, etc.) no
 * longer describe where it lives. If the path doesn't parse to an EID, it's a 404. When no existence
 * checker is available, a resolved EID is trusted.
 */
export const validateNavigationTarget = (params: {
  graph: AppGraph.ExpandableGraph;
  subjectId: string;
  checkLocalExistence?: ExistenceChecker;
  checkRemoteExistence?: ExistenceChecker;
}): Effect.Effect<string> => {
  const { graph, subjectId, checkLocalExistence, checkRemoteExistence } = params;

  // Skip validation for system paths.
  if (subjectId === NOT_FOUND_PATH || subjectId === GraphNode.RootId || GraphPath.isPinnedWorkspace(subjectId)) {
    return Effect.succeed(subjectId);
  }

  // Fast path: the target is already a node in the local graph, so it needs no expansion to be
  // confirmed. Checking before expanding keeps a click on an already-rendered node (the nav tree, a
  // breadcrumb) from re-expanding every ancestor and churning the graph on every navigation.
  if (Option.isSome(AppGraph.getNode(graph, subjectId))) {
    return Effect.succeed(subjectId);
  }

  // Not present: expand the path to trigger the loads that may materialize it.
  expandPath(graph, subjectId);
  if (Option.isSome(AppGraph.getNode(graph, subjectId))) {
    return Effect.succeed(subjectId);
  }

  return Effect.gen(function* () {
    // A view node (`…/<mailboxId>/sent`) carries its object id in an interior segment, hence the
    // candidate list rather than the single terminal id. If none parses, there's nothing to open.
    const candidates = GraphPath.tryGetEidCandidates(graph, subjectId);
    if (candidates.length === 0) {
      return NOT_FOUND_PATH;
    }

    // Check existence cheapest-first: local (fast) then remote (network, only when not local).
    // Local existence alone is sufficient — an object present locally is valid even if it hasn't
    // replicated to edge; remote existence rescues objects that exist remotely but not yet locally.
    const exists = (checker?: ExistenceChecker): Effect.Effect<boolean> =>
      Effect.gen(function* () {
        if (!checker) {
          return false;
        }
        for (const candidate of candidates) {
          const found = yield* checker(candidate).pipe(
            Effect.catch((error) => {
              log.warn('existence check failed', { subjectId, error });
              return Effect.succeed(false);
            }),
          );
          if (found) {
            return true;
          }
        }
        return false;
      });

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
 * Like {@link ExistenceChecker} but fallible: a `false` means the store answered "no", while a
 * failure means the question went unanswered. Callers that must distinguish absence from ignorance
 * (see `AppCapabilities.NavigationTargetVerdict`) need that difference preserved.
 */
export type ExistenceProbe = (echoUri: EID.EID) => Effect.Effect<boolean, unknown>;

/**
 * Create an {@link ExistenceProbe} backed by an edge execQuery function (remote existence).
 * The execQuery parameter should match the EdgeHttpClient.execQuery signature.
 */
export const createEdgeExistenceProbe = (
  execQuery: (spaceId: Key.SpaceId, body: { query: string; reactivity: number }) => Promise<{ results?: unknown[] }>,
): ExistenceProbe => {
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
    ).pipe(Effect.map((response) => (response.results?.length ?? 0) > 0));
  };
};

/**
 * Create an ExistenceChecker backed by an edge execQuery function (remote existence).
 * The execQuery parameter should match the EdgeHttpClient.execQuery signature.
 * An unreachable edge reads as "does not exist"; use {@link createEdgeExistenceProbe} where that
 * distinction matters.
 */
export const createEdgeExistenceChecker = (
  execQuery: (spaceId: Key.SpaceId, body: { query: string; reactivity: number }) => Promise<{ results?: unknown[] }>,
): ExistenceChecker => {
  const probe = createEdgeExistenceProbe(execQuery);
  return (echoUri) => probe(echoUri).pipe(Effect.catch(() => Effect.succeed(false)));
};
