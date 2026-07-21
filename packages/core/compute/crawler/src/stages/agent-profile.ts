//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Stage } from '@dxos/pipeline';

import { AgentRegistry, identifiersForUser, labelForUser } from '../AgentRegistry';
import { type StateError } from '../errors';
import { tapStage } from '../Stage';
import { type StateStore } from '../StateStore';
import type * as Type from '../types';

/**
 * Per-message stage: fold each authored message into the agent registry, accumulating message
 * counts and first/last-seen times. Builds the agent identities the extract-facts stage attributes
 * facts to.
 */
export const agentProfileStage = (): Stage.Stage<Type.Event, Type.Event, StateError, AgentRegistry | StateStore> =>
  tapStage('agent-profile', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const registry = yield* AgentRegistry;
          yield* registry.observe({
            identifiers: identifiersForUser(event.message.author),
            label: labelForUser(event.message.author),
            at: event.message.createdAt,
          });
        }),
  );
