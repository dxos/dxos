//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type MakeTurnProducer, makeAiSessionTurnProducer } from '@dxos/agent-runtime';
import { SessionConfig } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { AiAssistantError } from '@dxos/assistant';

import { AssistantCapabilities } from '#types';

/**
 * Composer's own engine, chosen when a process spawns rather than when the layer is built, so the
 * code-mode setting (and a late-contributed engine) applies to agents started after it changes.
 */
export const composerTurnProducer =
  (
    manager: CapabilityManager.CapabilityManager,
    codeModeTurnProducer: MakeTurnProducer | undefined,
  ): MakeTurnProducer =>
  (options) => {
    // An engine contributed for the whole app (evals, stories) takes precedence over the settings.
    const [contributed] = manager.getAll(AssistantCapabilities.AgentTurnProducer);
    if (contributed) {
      return contributed(options);
    }

    if (codeModeTurnProducer) {
      const [settings] = manager.getAll(AssistantCapabilities.Settings);
      const [registry] = manager.getAll(Capabilities.AtomRegistry);
      if (settings && registry?.get(settings).codeMode) {
        return codeModeTurnProducer(options);
      }
    }

    return makeAiSessionTurnProducer(options);
  };

/** Runs a chat on the agent its session names; one not registered on this device fails each turn visibly. */
export const resolveTurnProducer =
  (
    manager: CapabilityManager.CapabilityManager,
    codeModeTurnProducer: MakeTurnProducer | undefined,
  ): MakeTurnProducer =>
  (options) => {
    const harness = SessionConfig.harnessOf(options.chat.session);
    if (harness === SessionConfig.COMPOSER_HARNESS) {
      return composerTurnProducer(manager, codeModeTurnProducer)(options);
    }

    const agent = manager.getAll(AssistantCapabilities.Agent).find((agent) => agent.id === harness);
    if (agent) {
      return agent.makeTurnProducer(options);
    }

    return Effect.succeed({
      getSkills: () => [],
      runTurn: () =>
        Effect.fail(new AiAssistantError({ message: `The agent "${harness}" is not available on this device.` })),
    });
  };
