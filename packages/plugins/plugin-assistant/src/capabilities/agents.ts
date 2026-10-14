//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import { SessionConfig } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';

import { AssistantCapabilities, type AssistantOptions } from '#types';

import { composerTurnProducer } from './turn-producers.ts';

/** Registers Composer's own loop as an agent, so pickers list it beside the agents other plugins add. */
export default Capability.makeModule(
  Effect.fnUntraced(function* (options: AssistantOptions.AssistantPluginOptions | void) {
    const manager = yield* Capability.Service;
    return Capability.contribute(AssistantCapabilities.Agent, {
      id: SessionConfig.COMPOSER_HARNESS,
      label: 'Composer',
      icon: 'ph--sparkle--regular',
      availability: Atom.make<AssistantCapabilities.AgentAvailability>({ available: true }),
      makeTurnProducer: composerTurnProducer(manager, options?.codeModeTurnProducer?.(manager)),
    });
  }),
);
