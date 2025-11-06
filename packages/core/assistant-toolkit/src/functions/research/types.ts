//
// Copyright 2025 DXOS.org
//

import { type Type } from '@dxos/echo';
import { Text, type View } from '@dxos/schema';
import { Event, HasConnection, HasRelationship, LegacyOrganization, LegacyPerson, Project, Task } from '@dxos/types';

/**
 * Data types for research.
 */
export const ResearchDataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  // Objects
  Event.Event,
  LegacyOrganization,
  Task.Task,
  Text.Text,

  // Relations
  // TODO(wittjosiah): Until views (e.g., Table) support relations this needs to be expressed via organization ref.
  // Employer.Employer,
  LegacyPerson,
  Project.Project,
  HasRelationship.HasRelationship,
  HasConnection.HasConnection,
];
