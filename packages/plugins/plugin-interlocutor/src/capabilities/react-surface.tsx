//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Agent from '@dxos/assistant/Agent';
import { Organization, Person } from '@dxos/types';
import { Position } from '@dxos/util';

import { InterlocutorProperties, ProfileProperties } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      // Renders beside plugin-assistant's own Agent properties surface rather than replacing it.
      Surface.create({
        id: 'agentDiscordBinding',
        filter: AppSurface.object(AppSurface.ObjectProperties, Agent.Agent),
        position: Position.last,
        component: InterlocutorProperties,
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
