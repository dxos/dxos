//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Agent from '@dxos/assistant/Agent';

import { DISCORD_AGENT_COMPANION } from '../constants.ts';
import { DiscordNamespace } from '../namespace.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Beside an agent: sign in to Discord, install the bot in a server and route its channels to the agent.
      AppGraphBuilder.createExtension({
        id: 'discordAgentCompanion',
        relation: AppNode.companion,
        match: AppNodeMatcher.whenEchoTypeMatches(Agent.Agent),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: DISCORD_AGENT_COMPANION,
              label: ['discord-companion.label', { ns: DiscordNamespace.key }],
              icon: 'ph--discord-logo--regular',
              data: DISCORD_AGENT_COMPANION,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
