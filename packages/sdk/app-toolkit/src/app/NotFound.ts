//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Filter, Key, Query, Scope } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EID } from '@dxos/keys';
import { Attention } from '@dxos/react-ui-attention/types';

export const NOT_FOUND_NODE_ID = 'not-found';

/**
 * Canonical qualified path for the not-found sentinel node.
 * Navigation resolvers return this when a target does not exist.
 */
export const NOT_FOUND_PATH = `${GraphNode.RootId}/${NOT_FOUND_NODE_ID}`;

export const NOT_FOUND_NODE_TYPE = 'org.dxos.type.not-found';

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
 * A fallible remote existence probe: a `false` means the store answered "no", while a
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
 * Fold the verdicts gathered for one target (across its candidate ids and every loader). `absent`
 * requires unanimity over a non-empty set.
 */
export const combineVerdicts = (
  verdicts: readonly AppCapabilities.NavigationTargetVerdict[],
): AppCapabilities.NavigationTargetVerdict => {
  if (verdicts.includes('exists')) {
    return 'exists';
  }
  if (verdicts.length === 0 || verdicts.includes('unknown')) {
    return 'unknown';
  }
  return 'absent';
};
