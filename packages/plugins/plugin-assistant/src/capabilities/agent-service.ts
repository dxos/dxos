//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ProcessManager, RemoteProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { AssistantCapabilities, AssistantOptions } from '#types';

import { resolveTurnProducer } from './turn-producers.ts';

//
// Capability Module
//
// Owns the application-affinity {@link AgentService} layer for process-backed agents.
//

const makeAgentServiceSpec = (codeModeTurnProducer: AssistantOptions.AssistantPluginOptions['codeModeTurnProducer']) =>
  LayerSpec.make(
    {
      affinity: 'application',
      // `RemoteProcessManager` is what a session asking for `location: 'edge'` is spawned on. Declared,
      // not read optionally: a tag this spec does not require is never in its context, so the optional
      // read this used to do always came back empty and edge sessions failed with the manager present in
      // the app. plugin-routine contributes it for every stack, falling back to `layerNoop` where no edge
      // service is configured.
      requires: [ProcessManager.ProcessManagerService, RemoteProcessManager.Service, Capability.Service],
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
            processes: () => manager.getAll(AssistantCapabilities.AgentProcess),
          });
        }),
      ),
  );

export default Capability.makeModule((options: AssistantOptions.AssistantPluginOptions | void) =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, makeAgentServiceSpec(options?.codeModeTurnProducer))),
);
