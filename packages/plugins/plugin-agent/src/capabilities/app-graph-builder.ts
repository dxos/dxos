//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Agent from '@dxos/assistant/Agent';
import * as Account from '@dxos/plugin-client/Account';

import { meta } from '#meta';
import { AgentCompanion } from '#types';

import { AGENTS_PANEL, AGENTS_PANEL_PATH, AGENTS_PANEL_POSITION } from './agents-panel.ts';
import { createAgentWithIdentity } from './create-agent.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // plugin-assistant renders Agent articles but lists no Agent section, so agents would otherwise
      // be reachable only through the database subtree.
      TypeSection.createTypeSectionExtension(Agent.Agent, {
        urlKey: 'agent',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
        groupSegment: GraphPath.GroupSegments.ai,
        createObject: (space) => createAgentWithIdentity(space.db, { name: '' }),
      }),
      // Beside the agent's article (the viewer's private chat): what it knows and what it is doing.
      AppGraphBuilder.createExtension({
        id: 'agentCompanions',
        relation: AppNode.companion,
        match: AppNodeMatcher.whenEchoTypeMatches(Agent.Agent),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: AgentCompanion.BRAIN,
              label: ['brain-companion.label', { ns: meta.profile.key }],
              icon: 'ph--brain--regular',
              data: AgentCompanion.BRAIN,
            }),
            AppNode.makeCompanion({
              variant: AgentCompanion.ACTIVITY,
              label: ['activity-companion.label', { ns: meta.profile.key }],
              icon: 'ph--pulse--regular',
              data: AgentCompanion.ACTIVITY,
            }),
            AppNode.makeCompanion({
              variant: AgentCompanion.BRAIN_STORE,
              label: ['brain-debug-companion.label', { ns: meta.profile.key }],
              icon: 'ph--bug--regular',
              data: AgentCompanion.BRAIN_STORE,
            }),
          ]),
      }),
      // The agents the identity administers, among the account's panels beside its devices.
      AppGraphBuilder.createExtension({
        id: 'accountAgents',
        url: { key: AGENTS_PANEL, kind: 'singleton', path: [] },
        match: (node) => (node.id === Account.workspacePath ? Option.some(node) : Option.none()),
        connector: () =>
          Effect.succeed([
            AppGraphNode.make({
              id: AGENTS_PANEL,
              data: AGENTS_PANEL_PATH,
              type: meta.profile.key,
              properties: {
                position: AGENTS_PANEL_POSITION,
                label: ['agents-panel.label', { ns: meta.profile.key }],
                icon: 'ph--robot--regular',
                testId: 'agentPlugin.agents',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
