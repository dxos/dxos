//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { Tag } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { Collection, DataTypes } from '@dxos/schema';
import {
  AnchoredTo,
  Employer,
  Event,
  HasConnection,
  HasRelationship,
  HasSubject,
  Organization,
  Person,
  Project,
  Task,
} from '@dxos/types';

import { SpaceEvents } from '../events';
import { meta } from '../meta';
import { type CreateObject, type SpacePluginOptions } from '../types';

import { database, queue, space } from './commands';

const IdentityCreated = Capability.lazy(
  'IdentityCreated',
  () => import('../capabilities/identity-created/identity-created'),
);
const IntentResolver = Capability.lazy(
  'IntentResolver',
  () => import('../capabilities/intent-resolver/intent-resolver'),
);

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of intents?
  Common.Plugin.addCommandModule({
    commands: [database, queue, space],
  }),
  Common.Plugin.addSchemaModule({
    schema: [
      ...DataTypes,
      AnchoredTo.AnchoredTo,
      Employer.Employer,
      Event.Event,
      HasConnection.HasConnection,
      HasRelationship.HasRelationship,
      HasSubject.HasSubject,
      Organization.Organization,
      Person.Person,
      Project.Project,
      Tag.Tag,
      Task.Task,
    ],
  }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Collection.Collection.typename,
      metadata: {
        createObject: ((props) => Effect.sync(() => Collection.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Plugin.addModule(({ invitationUrl = 'http://localhost:5173', invitationProp = 'spaceInvitationCode' }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationProp, invitationCode);
      return baseUrl.toString();
    };

    return {
      id: Capability.getModuleTag(IntentResolver),
      activatesOn: Common.ActivationEvent.SetupIntentResolver,
      activate: (context) => IntentResolver({ context, createInvitationUrl, observability: false }),
    };
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.IdentityCreated,
    activatesAfter: [SpaceEvents.DefaultSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.make,
);
