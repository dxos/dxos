//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Agent from '@dxos/assistant/Agent';
import { Context } from '@dxos/context';
import { Database, type Ref } from '@dxos/echo';
import { type EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';
import { type SpaceId } from '@dxos/keys';
import { type BrainCrawlProtocol } from '@dxos/protocols';

import { CrawlError } from './errors.ts';

/** Addresses the agent's brain on EDGE: the space it lives in and its object id, which names the brain. */
export type CrawlLocation = { spaceId: SpaceId; agentId: string };

/**
 * Runs one of the EDGE client's crawl calls for the agent. The client has no Effect form, so this is the one Promise
 * boundary of the crawl handlers.
 */
export const callCrawl = Effect.fnUntraced(function* (
  agentRef: Ref.Ref<Agent.Agent>,
  call: (edge: EdgeHttpClient, ctx: Context, location: CrawlLocation) => Promise<BrainCrawlProtocol.CrawlStatus>,
) {
  const agent = yield* Database.load(agentRef);
  const spaceId = yield* Database.spaceId;
  const edge = yield* EdgeHttpClientService;
  return yield* Effect.tryPromise({
    try: () => call(edge, Context.default(), { spaceId, agentId: agent.id }),
    catch: (cause) =>
      new CrawlError({ message: cause instanceof Error ? cause.message : 'EDGE crawl request failed.', cause }),
  });
});
