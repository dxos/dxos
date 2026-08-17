//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Producer } from '@dxos/agent-claude/producer';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

/**
 * Runs the assistant's turns on the Claude Agent SDK host instead of DXOS's own `AiSession`.
 *
 * Startup, not the implicit Idle: `AgentServiceSpec` reads this registry once, when its layer
 * materializes, so a producer contributed later would never be seen — the same race the delegation
 * strategy has to win.
 *
 * Needs the host mounted in the dev server — see `DX_AGENT_CWD` in `.storybook/main.ts`.
 */
const AgentClaudePluginBuilder = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.agentClaude'),
    name: 'Agent (Claude SDK)',
  }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.agentClaude.module.producer',
    activatesOn: ActivationEvents.Startup,
    provides: [AssistantCapabilities.AgentTurnProducer],
    activate: () =>
      Effect.succeed([
        Capability.contribute(AssistantCapabilities.AgentTurnProducer, ({ feed }) =>
          Producer.make({ feed, maxTurns: 8 }),
        ),
      ]),
  }),
);

export const AgentClaudePlugin = Plugin.make(AgentClaudePluginBuilder)();
