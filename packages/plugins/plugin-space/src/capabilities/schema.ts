//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { Tag } from '@dxos/echo';
import { DataTypes } from '@dxos/schema';
import {
  AnchoredTo,
  Employer,
  Event,
  HasConnection,
  HasRelationship,
  HasSubject,
  Milestone,
  Organization,
  Person,
  Pipeline,
  Task,
  TaskSet,
} from '@dxos/types';

export const Schema = AppCapability.schema([
  ...DataTypes,
  AnchoredTo.AnchoredTo,
  AppSettings.AppSettings,
  Employer.Employer,
  Event.Event,
  HasConnection.HasConnection,
  HasRelationship.HasRelationship,
  HasSubject.HasSubject,
  Organization.Organization,
  Person.Person,
  Pipeline.Pipeline,
  Milestone.Milestone,
  Tag.Tag,
  Task.Task,
  TaskSet.TaskSet,
]);
