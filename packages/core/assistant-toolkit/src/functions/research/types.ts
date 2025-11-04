//
// Copyright 2025 DXOS.org
//

import { DataType } from '@dxos/schema';

/**
 * Data types for research.
 */
export const ResearchDataTypes = [
  // Objects
  DataType.Event,
  DataType.LegacyOrganization,
  DataType.LegacyPerson,
  DataType.Project.Project,
  DataType.Task,
  DataType.Text,

  // Relations
  // TODO(wittjosiah): Until views (e.g. table) support relations this needs to be expressed via organization ref.
  // DataType.Employer,
  DataType.HasRelationship,
  DataType.HasConnection,
];
