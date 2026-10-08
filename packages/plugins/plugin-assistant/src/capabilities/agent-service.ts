//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AgentService from '@dxos/compute/AgentService';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Process from '@dxos/compute/Process';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { AssistantOptions } from '#types';

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

export default Capability.makeModule((options: AssistantOptions.AssistantPluginOptions | void) =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, makeAgentServiceSpec(options?.codeModeTurnProducer))),
);
