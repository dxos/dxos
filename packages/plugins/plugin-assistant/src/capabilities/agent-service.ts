//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { AgentService } from '@dxos/functions-runtime';
import { AutomationCapabilities } from '@dxos/plugin-automation';

//
// Capability Module
//
// Owns the application-affinity {@link AgentService} layer for process-backed agents.
//

const AgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ProcessManager.ProcessManagerService, Capability.Service],
    provides: [AgentService.AgentService],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        // Optional supervisor behaviour, contributed by a plugin that knows the agent/plan model.
        const strategies = yield* Capability.getAll(AutomationCapabilities.AgentDelegationStrategy);
        return AgentService.layer({ delegationStrategy: strategies[0] });
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(Capabilities.LayerSpec, AgentServiceSpec)]),
);
