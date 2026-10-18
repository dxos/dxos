//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import { Context } from '@dxos/context';
import { Database, type Ref } from '@dxos/echo';
import { type EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';
import { type SpaceId } from '@dxos/keys';

import { AgentPresence } from '#types';

import { FactFeedError } from './errors.ts';

/** Addresses the agent's brain on EDGE: the space it serves and its name (see `AgentPresence.brainId`). */
export type BrainLocation = { spaceId: SpaceId; agent: string };

/**
 * Runs one of the EDGE client's fact feed calls for the agent. The client has no Effect form, so this is the one
 * Promise boundary of the fact feed handlers.
 */
export const callFactFeeds = Effect.fnUntraced(function* (
  agentRef: Ref.Ref<Agent.Agent>,
  call: (edge: EdgeHttpClient, ctx: Context, location: BrainLocation) => Promise<{ feeds: readonly string[] }>,
) {
  const agent = yield* Database.load(agentRef);
  const spaceId = yield* Database.spaceId;
  const edge = yield* EdgeHttpClientService;
  return yield* Effect.tryPromise({
    try: () => call(edge, Context.default(), { spaceId, agent: AgentPresence.brainId(agent) }),
    catch: (cause) =>
      new FactFeedError({ message: cause instanceof Error ? cause.message : 'EDGE fact feed request failed.', cause }),
  });
});
