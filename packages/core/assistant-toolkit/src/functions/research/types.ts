//
// Copyright 2025 DXOS.org
//

import { Text } from '@dxos/schema';
import { Event, HasConnection, HasRelationship, LegacyOrganization, LegacyPerson, Project, Task } from '@dxos/types';

/**
 * Data types for research.
 */
export const ResearchDataTypes = [
  // Objects
  Event.Event,
  LegacyOrganization,
  LegacyPerson,
  Project.Project,
  Task.Task,
  Text.Text,

  // Relations
  // TODO(wittjosiah): Until views (e.g. table) support relations this needs to be expressed via organization ref.
  // Employer.Employer,
  HasRelationship.HasRelationship,
  HasConnection.HasConnection,
];
