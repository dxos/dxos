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
  DataType.Organization,
  DataType.Person,
  DataType.Project,
  DataType.Task,
  DataType.Text,

  // Relations
  DataType.Employer,
  DataType.HasRelationship,
  DataType.HasConnection,
];
