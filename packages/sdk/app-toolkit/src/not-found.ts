//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Graph, Node } from '@dxos/app-graph';
import { DXN, Filter, Key, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { expandAttendableId } from '@dxos/react-ui-attention';

import { getSpaceIdFromPath, isCompanion, isPinnedWorkspace } from './paths';

export const NOT_FOUND_NODE_ID = 'not-found';
export const NOT_FOUND_NODE_TYPE = 'org.dxos.type.not-found';
export const NOT_FOUND_PATH = `${Node.RootId}/${NOT_FOUND_NODE_ID}`;

/**
 * Callback to check if an object exists on a remote service (e.g., edge).
 * Takes a DXN string identifying the object. Returns true if the object exists remotely.
 */
export type RemoteExistenceChecker = (dxn: DXN) => Promise<boolean>;

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
 * When a remote existence checker is provided (e.g., backed by edge), objects that exist
 * remotely but haven't replicated locally will be considered valid (replication will load them).
 * Without a checker (offline), objects not in the local graph are treated as not found.
 */
export const validateNavigationTarget = async (params: {
  graph: Graph.ExpandableGraph;
  subjectId: string;
  checkRemoteExistence?: RemoteExistenceChecker;
}): Promise<string> => {
  const { graph, subjectId, checkRemoteExistence } = params;

  // Skip validation for system paths.
  if (
    subjectId === NOT_FOUND_PATH ||
    subjectId === Node.RootId ||
    isCompanion(subjectId) ||
    isPinnedWorkspace(subjectId)
  ) {
    return subjectId;
  }

  // Expand the graph path to trigger loading.
  expandPath(graph, subjectId);

  // Check if node exists after expansion.
  if (Option.isSome(Graph.getNode(graph, subjectId))) {
    return subjectId;
  }

  // Node not found locally. Check remote if available.
  const spaceId = getSpaceIdFromPath(subjectId);
  const objectId = subjectId.split('/').pop();
  if (!spaceId || !objectId || !Key.ObjectId.isValid(objectId)) {
    log('cannot validate navigation target without valid space/object ID', { subjectId });
    return NOT_FOUND_PATH;
  }

  if (checkRemoteExistence) {
    try {
      const dxn = DXN.fromSpaceAndObjectId(spaceId, objectId as Key.ObjectId);
      const exists = await checkRemoteExistence(dxn);
      if (exists) {
        log('object exists remotely, waiting for replication', { subjectId });
        return subjectId;
      }
    } catch (error) {
      log.warn('remote existence check failed, treating as not found', { subjectId, error });
    }
  }

  log('navigation target not found', { subjectId });
  return NOT_FOUND_PATH;
};

/**
 * Create a RemoteExistenceChecker backed by an edge execQuery function.
 * The execQuery parameter should match the EdgeHttpClient.execQuery signature.
 */
export const createEdgeExistenceChecker = (
  execQuery: (spaceId: Key.SpaceId, body: { query: string; reactivity: number }) => Promise<{ results?: unknown[] }>,
): RemoteExistenceChecker => {
  return async (dxn) => {
    const echoDxn = dxn.asEchoDXN();
    if (!echoDxn?.spaceId || !echoDxn.echoId) {
      return false;
    }
    const queryAst = Query.select(Filter.id(echoDxn.echoId)).from({ spaceIds: [echoDxn.spaceId] }).ast;
    const response = await execQuery(echoDxn.spaceId, {
      query: JSON.stringify(queryAst),
      reactivity: 0,
    });
    return (response.results?.length ?? 0) > 0;
  };
};
