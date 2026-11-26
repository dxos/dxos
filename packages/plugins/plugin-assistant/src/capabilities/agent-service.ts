//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AgentService as AgentServiceRuntime } from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Agent from '@dxos/compute/Agent';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Process from '@dxos/compute/Process';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { AssistantCapabilities, AssistantOptions } from '#types';

import { consentGuard } from '../util/consent-guard.ts';
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
      provides: [Agent.Service],
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
            processes: () => manager.getAll(AssistantCapabilities.SessionProcess),
            serviceResolver: () => manager.getAll(Capabilities.ServiceResolver)[0],
            // Read when a process spawns, so the setting applies to agents started after it changes.
            threading: () => {
              const [settings] = manager.getAll(AssistantCapabilities.Settings);
              const [registry] = manager.getAll(Capabilities.AtomRegistry);
              const values = settings && registry?.get(settings);
              if (!values?.parallelThreads) {
                return undefined;
              }
              const shared = new Set(values.parallelThreadAgents ?? []);
              const tenants = manager
                .getAll(AssistantCapabilities.Agent)
                .filter((agent) => shared.has(agent.id))
                .map((agent) => ({ name: agent.id, makeTurnProducer: agent.makeTurnProducer }));
              return { limit: values.parallelThreadLimit, ...(tenants.length > 0 ? { tenants } : {}) };
            },
            hooks: () => manager.getAll(AppCapabilities.HookDefinition),
            // The guard the chat's own UI opens with, so a session another agent delegated to runs on its agent's
            // grants, and the UI later shares the process instead of respawning it.
            defaultGuard: (session) =>
              consentGuard(
                session,
                AssistantCapabilities.findSessionGuard(manager.getAll(AssistantCapabilities.SessionGuard), session),
              ),
            mcpEndpoint: (connection) =>
              ConnectorSpec.mcpEndpoint(manager.getAll(ConnectorSpec.Connector).flat(), connection),
          });
        }),
      ),
  );

export default Capability.makeModule((options: AssistantOptions.AssistantPluginOptions | void) =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, makeAgentServiceSpec(options?.codeModeTurnProducer))),
);
