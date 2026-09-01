//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { type AiRequest, AiSession } from '@dxos/assistant';
import type * as Instructions from '@dxos/compute/Instructions';
import type * as Skill from '@dxos/compute/Skill';
import type { Database, Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type { Message } from '@dxos/types';

/**
 * Produces one turn of a conversation.
 *
 * The agent process owns everything around a turn — the input queue, alarms, tool-call redelivery,
 * delegation, skill hooks, tracing, hydration — and none of that is specific to how the turn is
 * generated. This is the one thing that is, so an alternative engine (e.g. a Claude Agent SDK host)
 * can be substituted without touching the process.
 *
 * A producer MUST append each message it produces to the conversation's feed as it goes: the chat
 * thread renders from a reactive query over that feed, so a turn that is only returned never
 * appears.
 */
export interface TurnProducer {
  /**
   * Runs a turn, appending messages to the feed and returning what it produced.
   *
   * Must be interruptible — the process wraps the call and cancels it on interrupt.
   */
  runTurn(params: TurnRequest): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements>;

  /** Skills bound to this conversation, which the process fires end-request hooks against. */
  getSkills(): Skill.Skill[];
}

export type TurnRequest = {
  prompt: Parameters<AiSession.Session['createRequest']>[0]['prompt'];
  system?: string;
  mcpServers?: Parameters<AiSession.Session['createRequest']>[0]['mcpServers'];
  /**
   * Queued feed item (message or alarm) this turn dequeues. A producer that persists the user
   * prompt message stamps it as `AckAnnotation`; one that does not may ignore it — the process
   * acks explicitly after the turn.
   */
  ack?: Parameters<AiSession.Session['createRequest']>[0]['ack'];
};

export type MakeTurnProducerOptions = {
  feed: Feed.Feed;
  runtime: Context.Context<Database.Service>;
  instructions: Instructions.Instructions[];
};

/**
 * Builds the producer for a conversation as a scoped effect — teardown registers with the scope
 * (`Effect.acquireRelease`/`addFinalizer`), so the process's scope owns the producer's lifetime.
 * The default drives DXOS's own `AiSession`.
 */
export type MakeTurnProducer = (options: MakeTurnProducerOptions) => Effect.Effect<TurnProducer, never, Scope.Scope>;

/**
 * The default producer: `AiSession.Session`, which resolves the model, binds skills and context
 * objects as tools, and appends each message to the feed via its `onOutput` hook.
 */
export const makeAiSessionTurnProducer: MakeTurnProducer = ({ feed, runtime, instructions }) =>
  EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime, instructions })).pipe(
    Effect.map((session) => ({
      runTurn: (params: TurnRequest) => session.createRequest(params),
      getSkills: () => session.context.getSkills(),
    })),
  );
