//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  AgentService as AgentServiceRuntime,
  type MakeTurnProducer,
  makeAiSessionTurnProducer,
} from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AgentService from '@dxos/compute/AgentService';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Process from '@dxos/compute/Process';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { AssistantCapabilities, AssistantOptions } from '#types';

//
// Capability Module
//
// Owns the application-affinity {@link AgentService} layer for process-backed agents.
//

const makeAgentServiceSpec = (codeModeTurnProducer: AssistantOptions.AssistantPluginOptions['codeModeTurnProducer']) =>
  LayerSpec.make(
    {
      affinity: 'application',
      // Declared, not read optionally: a tag this spec does not require is never in its context. The
      // manager spans the local and remote runtimes; plugin-routine contributes it for every stack.
      requires: [Process.ManagerService, Capability.Service],
      provides: [AgentService.AgentService],
    },
    () =>
      Layer.unwrap(
        Effect.gen(function* () {
          // Optional supervisor behaviour, contributed by a plugin that knows the agent/plan model.
          const strategies = yield* Capability.getAll(RoutineCapabilities.AgentDelegationStrategy);
          const manager = yield* Capability.Service;
          const codeMode = codeModeTurnProducer?.(manager);
          return AgentServiceRuntime.layer({
            delegationStrategy: strategies[0],
            makeTurnProducer: (options) => resolveTurnProducer(manager, codeMode)(options),
          });
        }),
      ),
  );

/**
 * Picks the turn engine when a process spawns rather than when the layer is built, so the code-mode
 * setting (and a late-contributed producer) applies to agents started after it changes.
 */
const resolveTurnProducer = (
  manager: CapabilityManager.CapabilityManager,
  codeModeTurnProducer: MakeTurnProducer | undefined,
): MakeTurnProducer => {
  // An alternative engine (e.g. the Claude Agent SDK host) takes precedence over the settings.
  const [contributed] = manager.getAll(AssistantCapabilities.AgentTurnProducer);
  if (contributed) {
    return contributed;
  }

  if (codeModeTurnProducer) {
    const [settings] = manager.getAll(AssistantCapabilities.Settings);
    const [registry] = manager.getAll(Capabilities.AtomRegistry);
    if (settings && registry?.get(settings).codeMode) {
      return codeModeTurnProducer;
    }
  }

  return makeAiSessionTurnProducer;
};

export default Capability.makeModule((options: AssistantOptions.AssistantPluginOptions | void) =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, makeAgentServiceSpec(options?.codeModeTurnProducer))),
);
