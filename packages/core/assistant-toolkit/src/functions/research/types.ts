//
// Copyright 2025 DXOS.org
//

import { DataType } from '@dxos/schema';

/**
 * Data types for research.
 */
export const ResearchDataTypes = [
  // Objects
  DataType.Event.Event,
  DataType.LegacyOrganization,
  DataType.LegacyPerson,
  DataType.Project.Project,
  DataType.Task.Task,
  DataType.Text.Text,

  // Relations
  // TODO(wittjosiah): Until views (e.g. table) support relations this needs to be expressed via organization ref.
  // DataType.Employer.Employer,
  DataType.HasRelationship.HasRelationship,
  DataType.HasConnection.HasConnection,
];
