//
// Copyright 2025 DXOS.org
//

import { type Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Event, HasConnection, HasRelationship, LegacyOrganization, LegacyPerson, Pipeline, Task } from '@dxos/types';

/**
 * Data types for research.
 */
// TODO(burdon): This should not be hardcoded.
export const ResearchDataTypes: Type.Entity.Any[] = [
  // Objects
  Event.Event,
  Task.Task,
  Text.Text,

  // TODO(wittjosiah): Until views (e.g., Table) support relations this needs to be expressed via organization ref.
  // Employer.Employer,
  // Organization.Organization,
  LegacyPerson,
  LegacyOrganization,

  Pipeline.Pipeline,

  // Relations
  HasRelationship.HasRelationship,
  HasConnection.HasConnection,
];
