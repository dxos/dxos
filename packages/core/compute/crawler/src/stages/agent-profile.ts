//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Stage } from '@dxos/pipeline';

import * as AgentRegistry from '../AgentRegistry.ts';
import { type StateError } from '../errors.ts';
import { tapStage } from '../Stage.ts';
import type * as StateStore from '../StateStore.ts';
import type * as Type from '../types.ts';

/**
 * Per-message stage: fold each authored message into the agent registry, accumulating message
 * counts and first/last-seen times. Builds the agent identities the extract-facts stage attributes
 * facts to.
 */
export const agentProfileStage = (): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  AgentRegistry.AgentRegistry | StateStore.StateStore
> =>
  tapStage('agent-profile', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : AgentRegistry.observe({
          identifiers: AgentRegistry.identifiersForUser(event.message.author),
          label: AgentRegistry.labelForUser(event.message.author),
          at: event.message.createdAt,
        }),
  );
