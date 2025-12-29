//
// Copyright 2025 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Tag } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
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
import { CollectionAction, type CreateObjectIntent, type SpacePluginOptions } from '../types';

import { database, queue, space } from './commands';

const IdentityCreated = Capability.lazy('IdentityCreated', () => import('../capabilities/identity-created'));
const IntentResolver = Capability.lazy('IntentResolver', () => import('../capabilities/intent-resolver'));

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of intents?
  Plugin.addModule({
    id: 'cli-commands',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => [
      Capability.contributes(Common.Capability.Command, database),
      Capability.contributes(Common.Capability.Command, queue),
      Capability.contributes(Common.Capability.Command, space),
    ],
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [
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
      ]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () => [
      Capability.contributes(Common.Capability.Metadata, {
        id: Collection.Collection.typename,
        metadata: {
          createObjectIntent: ((props) => createIntent(CollectionAction.Create, props)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
    ],
  }),
  Plugin.addModule(({ invitationUrl = 'http://localhost:5173', invitationParam = 'spaceInvitationCode' }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationParam, invitationCode);
      return baseUrl.toString();
    };

    return {
      id: 'intent-resolver',
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
