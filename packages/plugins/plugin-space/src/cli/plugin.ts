//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Tag } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client/types';
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
  Pipeline,
  Task,
} from '@dxos/types';

import { IdentityCreated } from '../capabilities/identity-created';
import { OperationResolver } from '../capabilities/operation-resolver';
import { meta } from '../meta';
import { SpaceEvents } from '../types';
import { type CreateObject, type SpacePluginOptions } from '../types';

import { database, queue, space } from './commands';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  AppPlugin.addCommandModule({
    commands: [database, queue, space],
  }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Collection.Collection.typename,
      metadata: {
        createObject: ((props) => Effect.sync(() => Collection.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addSchemaModule({
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
      Pipeline.Pipeline,
      Tag.Tag,
      Task.Task,
    ],
  }),
  Plugin.addModule(
    ({
      shareableLinkOrigin = 'http://localhost:5173',
      invitationPath = '/',
      invitationProp = 'spaceInvitationCode',
    }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };

      return {
        id: Capability.getModuleTag(OperationResolver),
        activatesOn: ActivationEvents.SetupOperationResolver,
        activate: () => OperationResolver({ createInvitationUrl, observability: false }),
      };
    },
  ),
  Plugin.addModule({
    activatesOn: ClientEvents.IdentityCreated,
    activatesAfter: [SpaceEvents.DefaultSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.make,
);
