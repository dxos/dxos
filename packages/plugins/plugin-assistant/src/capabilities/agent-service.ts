//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ProcessManager, RemoteProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { AssistantCapabilities } from '#types';

//
// Capability Module
//
// Owns the application-affinity {@link AgentService} layer for process-backed agents.
//

const AgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    // `RemoteProcessManager` is what a session asking for `location: 'edge'` is spawned on, but it is
    // resolved optionally: requiring it here prunes this provider on a stack that hosts only local
    // agents, taking `AgentService` with it.
    requires: [ProcessManager.ProcessManagerService, Capability.Service],
    provides: [AgentService.AgentService],
  },
  () =>
    Layer.unwrap(
      Effect.gen(function* () {
        // Optional supervisor behaviour, contributed by a plugin that knows the agent/plan model.
        const strategies = yield* Capability.getAll(RoutineCapabilities.AgentDelegationStrategy);
        // Optional alternative turn engine (e.g. the Claude Agent SDK host); absent by default, in
        // which case the process runs turns through DXOS's own AiSession.
        const producers = yield* Capability.getAll(AssistantCapabilities.AgentTurnProducer);
        // Read from the slice rather than required: requiring it prunes this provider (and
        // `AgentService` with it) on a stack that hosts only local agents.
        const remote = yield* Effect.serviceOption(RemoteProcessManager.Service);
        return AgentServiceRuntime.layer({
          delegationStrategy: strategies[0],
          makeTurnProducer: producers[0],
          getRemoteManager: Option.match(remote, {
            onNone: () => undefined,
            onSome: (manager) => () => Effect.succeed(manager),
          }),
        });
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, AgentServiceSpec)),
);
