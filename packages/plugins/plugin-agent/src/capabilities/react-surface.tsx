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

import { AgentActivity, ProfileProperties } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      // The Agent's main article; first so it outranks plugin-assistant's instructions-only AgentArticle,
      // whose fields are edited in the Properties panel.
      Surface.create({
        id: 'agentActivity',
        filter: AppSurface.object(AppSurface.Article, Agent.Agent),
        position: Position.first,
        component: AgentActivity,
        props: ({ role, data: { subject } }) => ({ role, agent: subject }),
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
