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
import * as Agent from '@dxos/assistant/Agent';
import { isSpace } from '@dxos/client/echo';
import { Filter, Order, Query } from '@dxos/echo';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { meta } from '#meta';
import { AgentCompanion } from '#types';

import { AGENTS_SECTION_ID, AGENTS_SECTION_TYPE } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Agents are managed in space settings, like connections, rather than listed with the space's content.
      AppGraphBuilder.createExtension({
        id: 'agentsSection',
        url: { key: AGENTS_SECTION_ID, kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
        match: AppNodeMatcher.whenSpaceSettings,
        connector: (space) =>
          Effect.succeed([
            AppGraphNode.make({
              id: AGENTS_SECTION_ID,
              type: AGENTS_SECTION_TYPE,
              data: AGENTS_SECTION_TYPE,
              properties: {
                label: ['agents-section.label', { ns: meta.profile.key }],
                icon: 'ph--drone--regular',
                iconHue: 'emerald',
                draggable: false,
                droppable: false,
                space,
                testId: 'agentPlugin.agentsSection',
              },
            }),
          ]),
      }),
      AppGraphBuilder.createExtension({
        id: 'agentListing',
        url: { key: 'agent', kind: 'item', path: [SpaceSchema.SETTINGS_SECTION_ID, AGENTS_SECTION_ID] },
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === AGENTS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const agents = get(
            space.db.query(Query.select(Filter.type(Agent.Agent)).orderBy(Order.property('name', 'asc'))).atom,
          );
          return Effect.succeed(
            agents
              .map((agent) => AppNode.makeObject({ get, db: space.db, object: agent, draggable: false }))
              .filter((node): node is NonNullable<typeof node> => node !== null)
              // Settings hue, like the other settings entries; the Agent type keeps its own hue elsewhere.
              .map((node) => ({ ...node, properties: { ...node.properties, iconHue: 'emerald' } })),
          );
        },
      }),
      // Beside the agent's article (the viewer's private chat): what it knows, what it is doing and its email address.
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
              variant: AgentCompanion.EMAIL,
              label: ['email-companion.label', { ns: meta.profile.key }],
              icon: 'ph--envelope--regular',
              data: AgentCompanion.EMAIL,
            }),
            AppNode.makeCompanion({
              variant: AgentCompanion.BRAIN_STORE,
              label: ['brain-debug-companion.label', { ns: meta.profile.key }],
              icon: 'ph--bug--regular',
              data: AgentCompanion.BRAIN_STORE,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
