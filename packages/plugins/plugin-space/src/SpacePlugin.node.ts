//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Tag } from '@dxos/echo';
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
import { type SpacePluginOptions } from '#types';

import { database, queue, space } from './commands';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addLazyModule(AppCapability.commands([database, queue, space])),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(
    AppCapability.schema([
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
    ]),
  ),
  Plugin.addLazyModule(UndoMappings),
  Plugin.addLazyModule(IdentityCreated),
  Plugin.make,
);

export default SpacePlugin;
