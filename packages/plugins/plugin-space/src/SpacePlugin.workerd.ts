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

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const SpacePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
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
  Plugin.make,
);

export default SpacePlugin;
