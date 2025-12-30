//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin, lazy } from '@dxos/app-framework';
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

const IdentityCreated = lazy(() => import('../capabilities/identity-created'));
const IntentResolver = lazy(() => import('../capabilities/intent-resolver'));

export const SpacePlugin = definePlugin<SpacePluginOptions>(
  meta,
  ({ invitationUrl = 'http://localhost:5173', invitationProp = 'spaceInvitationCode' }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationProp, invitationCode);
      return baseUrl.toString();
    };

    return [
      // TODO(wittjosiah): Could some of these commands make use of intents?
      defineModule({
        id: `${meta.id}/module/cli-commands`,
        activatesOn: Events.Startup,
        activate: () => [
          contributes(Capabilities.Command, database),
          contributes(Capabilities.Command, queue),
          contributes(Capabilities.Command, space),
        ],
      }),
      defineModule({
        id: `${meta.id}/module/schema`,
        activatesOn: ClientEvents.SetupSchema,
        activate: () =>
          contributes(ClientCapabilities.Schema, [
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
      defineModule({
        id: `${meta.id}/module/metadata`,
        activatesOn: Events.SetupMetadata,
        activate: () => [
          contributes(Capabilities.Metadata, {
            id: Collection.Collection.typename,
            metadata: {
              createObjectIntent: ((props) =>
                createIntent(CollectionAction.Create, props)) satisfies CreateObjectIntent,
              addToCollectionOnCreate: true,
            },
          }),
        ],
      }),
      defineModule({
        id: `${meta.id}/module/intent-resolver`,
        activatesOn: Events.SetupIntentResolver,
        activate: (context) => IntentResolver({ context, createInvitationUrl, observability: false }),
      }),
      defineModule({
        id: `${meta.id}/module/identity-created`,
        activatesOn: ClientEvents.IdentityCreated,
        activatesAfter: [SpaceEvents.DefaultSpaceReady],
        activate: IdentityCreated,
      }),
    ];
  },
);
