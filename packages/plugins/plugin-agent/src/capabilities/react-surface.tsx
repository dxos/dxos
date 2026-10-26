//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Agent from '@dxos/assistant/Agent';
import { Channel, Organization, Person } from '@dxos/types';
import { Position } from '@dxos/util';

import {
  AgentActivity,
  AgentEmailSetup,
  AgentKnowledge,
  AgentPrivateChat,
  AgentsPanel,
  AgentsSettings,
  BrainStore,
  EmailChannelProperties,
  ProfileProperties,
} from '#containers';
import { AgentCompanion, AgentEmail } from '#types';

import { AGENTS_SECTION_TYPE } from '../constants.ts';
import { AGENTS_PANEL_PATH } from './agents-panel.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      // The Agent's main article: the viewer's own private chat with it. First so it outranks plugin-assistant's
      // instructions-only AgentArticle, whose fields are edited in the Properties panel.
      Surface.create({
        id: 'agentPrivateChat',
        filter: AppSurface.object(AppSurface.Article, Agent.Agent),
        position: Position.first,
        component: AgentPrivateChat,
        props: ({ role, data: { subject, attendableId, nodeId } }) => ({ role, agent: subject, attendableId, nodeId }),
      }),
      // What the agent knows: facts read from its conversations, the goals it watches and its graph.
      Surface.create({
        id: 'agentBrain',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, AgentCompanion.BRAIN),
          AppSurface.companion(AppSurface.Article, Agent.Agent),
        ),
        component: AgentKnowledge,
        props: ({ role, data: { companionTo } }) => ({ role, agent: companionTo }),
      }),
      // The channels it converses in, its skills and its channel conversations.
      Surface.create({
        id: 'agentActivity',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, AgentCompanion.ACTIVITY),
          AppSurface.companion(AppSurface.Article, Agent.Agent),
        ),
        component: AgentActivity,
        props: ({ role, data: { companionTo } }) => ({ role, agent: companionTo }),
      }),
      // The agent's address: create it, then edit it and connect its mailbox.
      Surface.create({
        id: 'agentEmail',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, AgentCompanion.EMAIL),
          AppSurface.companion(AppSurface.Article, Agent.Agent),
        ),
        component: AgentEmailSetup,
        props: ({ role, data: { companionTo } }) => ({ role, agent: companionTo }),
      }),
      // The space's agents, under space settings.
      Surface.create({
        id: 'agentsSettings',
        filter: AppSurface.literal(AppSurface.Article, AGENTS_SECTION_TYPE),
        component: AgentsSettings,
      }),
      // A debug view of the brain store as held: raw facts, rules, their matching format and outboxes.
      Surface.create({
        id: 'agentBrainStore',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, AgentCompanion.BRAIN_STORE),
          AppSurface.companion(AppSurface.Article, Agent.Agent),
        ),
        component: BrainStore,
        props: ({ role, data: { companionTo } }) => ({ role, agent: companionTo }),
      }),
      Surface.create({
        id: 'accountAgents',
        filter: AppSurface.literal(AppSurface.Article, AGENTS_PANEL_PATH),
        component: AgentsPanel,
      }),
      // An email channel's address and sender allowlist, wherever its properties show (the agent's channel list too).
      Surface.create({
        id: 'emailChannelProperties',
        filter: AppSurface.object(
          AppSurface.ObjectProperties,
          Channel.Channel,
          (data) => data.subject.backend.kind === AgentEmail.BACKEND_KIND,
        ),
        component: EmailChannelProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      // Appended to the Person/Organization properties panel; plugin-crm contributes no surface there.
      Surface.create({
        id: 'personProfileGraph',
        filter: AppSurface.object(AppSurface.ObjectProperties, Person.Person),
        position: Position.last,
        component: ProfileProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'organizationProfileGraph',
        filter: AppSurface.object(AppSurface.ObjectProperties, Organization.Organization),
        position: Position.last,
        component: ProfileProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
