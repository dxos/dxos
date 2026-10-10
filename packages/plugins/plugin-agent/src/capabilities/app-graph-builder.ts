//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';

import { meta } from '#meta';
import { AgentCompanion, AgentOperation } from '#types';

import { INVITE_AGENT_DIALOG } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // plugin-assistant renders Agent articles but lists no Agent section, so agents would otherwise
      // be reachable only through the database subtree.
      TypeSection.createTypeSectionExtension(Agent.Agent, {
        urlKey: 'agent',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
        groupSegment: GraphPath.GroupSegments.ai,
        createObject: (space) =>
          Operation.invoke(AgentOperation.CreateAgent, { name: '' }, { spaceId: space.db.spaceId }),
      }),
      // Brings the agent into another space, where it keeps its memory.
      AppGraphBuilder.createTypeExtension({
        id: 'agentActions',
        type: Agent.Agent,
        actions: (agent) =>
          Effect.succeed([
            AppGraphNode.makeAction({
              id: AgentOperation.InviteAgent.meta.key,
              data: () =>
                Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: INVITE_AGENT_DIALOG,
                  blockAlign: 'start',
                  props: { agent },
                }),
              properties: {
                label: ['invite-agent.label', { ns: meta.profile.key }],
                icon: AgentOperation.InviteAgent.meta.icon,
                disposition: 'list-item',
                testId: 'agent.invite',
              },
            }),
          ]),
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
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
