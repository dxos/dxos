//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Agent from '@dxos/assistant/Agent';
import { Organization, Person } from '@dxos/types';
import { Position } from '@dxos/util';

import { AgentActivity, AgentKnowledge, AgentPrivateChat, BrainStore, ProfileProperties } from '#containers';
import { AgentCompanion } from '#types';

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
        props: ({ role, data: { subject, attendableId } }) => ({ role, agent: subject, attendableId }),
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
