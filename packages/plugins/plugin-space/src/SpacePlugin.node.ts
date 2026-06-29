//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Tag } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { DataTypes } from '@dxos/schema';
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

import { CreateObject, IdentityCreated, OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { type SpacePluginOptions, SpaceEvents } from '#types';

import { database, queue, space } from './commands';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  AppPlugin.addCommandModule({
    commands: [database, queue, space],
  }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
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
        id: Capability.getModuleTag(UndoMappings),
        activatesOn: ActivationEvents.SetupProcessManager,
        activate: () => UndoMappings({ createInvitationUrl, observability: false }),
      };
    },
  ),
  Plugin.addModule({
    activatesOn: ClientEvents.IdentityCreated,
    firesAfterActivation: [SpaceEvents.PersonalSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.make,
);

export default SpacePlugin;
