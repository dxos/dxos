//
// Copyright 2025 DXOS.org
//

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

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [
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
];
