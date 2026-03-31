//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Graph, Node } from '@dxos/app-graph';
import { DXN, Filter, Key, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { expandAttendableId } from '@dxos/react-ui-attention';

import { type AppCapabilities } from './capabilities';
import { isCompanion, isPinnedWorkspace } from './paths';

export const NOT_FOUND_NODE_ID = 'not-found';
export const NOT_FOUND_NODE_TYPE = 'org.dxos.type.not-found';
export const NOT_FOUND_PATH = `${Node.RootId}/${NOT_FOUND_NODE_ID}`;

/**
 * Callback to check if an object exists on a remote service (e.g., edge).
 * Takes a DXN identifying the object. Returns an Effect resolving to true if the object exists remotely.
 */
export type RemoteExistenceChecker = (dxn: DXN) => Effect.Effect<boolean>;

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
 * Path resolvers (NavigationPathResolver) are used to determine if the path is valid
 * and to extract a DXN for remote validation. If no resolver recognizes the path, it's 404.
 *
 * When a remote existence checker is provided (e.g., backed by edge), objects that exist
 * remotely but haven't replicated locally will be considered valid (replication will load them).
 * Without a checker (offline), objects not in the local graph are treated as not found.
 */
export const validateNavigationTarget = (params: {
  graph: Graph.ExpandableGraph;
  subjectId: string;
  pathResolvers: AppCapabilities.NavigationPathResolver[];
  checkRemoteExistence?: RemoteExistenceChecker;
}): Effect.Effect<string> => {
  const { graph, subjectId, pathResolvers, checkRemoteExistence } = params;

  // Skip validation for system paths.
  if (
    subjectId === NOT_FOUND_PATH ||
    subjectId === Node.RootId ||
    isCompanion(subjectId) ||
    isPinnedWorkspace(subjectId)
  ) {
    return Effect.succeed(subjectId);
  }

  // Expand the graph path to trigger loading.
  expandPath(graph, subjectId);

  // Check if node exists after expansion.
  if (Option.isSome(Graph.getNode(graph, subjectId))) {
    return Effect.succeed(subjectId);
  }

  // Node not found locally. Ask path resolvers to identify the DXN for this path.
  return Effect.gen(function* () {
    const dxn = yield* Effect.reduce(pathResolvers, Option.none<DXN>(), (acc, resolver) =>
      Option.isSome(acc)
        ? Effect.succeed(acc)
        : resolver(subjectId).pipe(Effect.catchAll(() => Effect.succeed(Option.none<DXN>()))),
    );

    if (Option.isNone(dxn)) {
      log('no resolver recognized path, treating as not found', { subjectId });
      return NOT_FOUND_PATH;
    }

    // Path is valid. Check remote existence if available.
    if (checkRemoteExistence) {
      const exists = yield* checkRemoteExistence(dxn.value).pipe(
        Effect.catchAll(() => {
          log.warn('remote existence check failed, treating as not found', { subjectId });
          return Effect.succeed(false);
        }),
      );
      if (exists) {
        log('object exists remotely, waiting for replication', { subjectId });
        return subjectId;
      }
    }

    log('navigation target not found', { subjectId });
    return NOT_FOUND_PATH;
  });
};

/**
 * Create a RemoteExistenceChecker backed by an edge execQuery function.
 * The execQuery parameter should match the EdgeHttpClient.execQuery signature.
 */
export const createEdgeExistenceChecker = (
  execQuery: (spaceId: Key.SpaceId, body: { query: string; reactivity: number }) => Promise<{ results?: unknown[] }>,
): RemoteExistenceChecker => {
  return (dxn) => {
    const echoDxn = dxn.asEchoDXN();
    if (!echoDxn?.spaceId || !echoDxn.echoId) {
      return Effect.succeed(false);
    }
    const queryAst = Query.select(Filter.id(echoDxn.echoId)).from({ spaceIds: [echoDxn.spaceId] }).ast;
    return Effect.tryPromise(() =>
      execQuery(echoDxn.spaceId!, {
        query: JSON.stringify(queryAst),
        reactivity: 0,
      }),
    ).pipe(
      Effect.map((response) => (response.results?.length ?? 0) > 0),
      Effect.catchAll(() => Effect.succeed(false)),
    );
  };
};
