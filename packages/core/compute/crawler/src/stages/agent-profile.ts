//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentRegistry, identifiersForUser, labelForUser } from '../AgentRegistry';
import { StageError } from '../errors';
import { type Stage } from '../Stage';

/**
 * Per-message stage: fold each authored message into the agent registry, accumulating message
 * counts and first/last-seen times. This is the "track all users + collect metadata" requirement,
 * and it builds the agent identities the extract-facts stage attributes facts to.
 */
export const makeAgentProfileStage = (): Stage => ({
  name: 'agent-profile',
  handles: ['Message'],
  apply: (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const { message } = event;
          const registry = yield* AgentRegistry;
          yield* registry.observe({
            identifiers: identifiersForUser(message.author),
            label: labelForUser(message.author),
            at: message.createdAt,
          });
        }).pipe(Effect.mapError((cause) => new StageError({ message: 'Failed to update agent profile', cause }))),
});
