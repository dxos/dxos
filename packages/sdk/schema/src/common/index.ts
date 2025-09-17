//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Replace instanceof checks.
// TODO(burdon): Remove Type suffix from other type defs (after API changes).
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */
export * as DataType from './DataType';
import type { Type } from '@dxos/echo';
import * as DataType from './DataType';

export const DataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  // Objects
  DataType.AccessToken,
  DataType.Collection,
  DataType.QueryCollection,
  DataType.Event,
  DataType.Organization,
  DataType.Person,
  DataType.Project,
  DataType.StoredSchema,
  DataType.Task,
  DataType.Text,
  DataType.View,

  // Relations
  DataType.Employer,
  DataType.HasRelationship,
  DataType.HasConnection,
];

// TODO(burdon): Remove (fix The inferred type of 'DeleteMessage' cannot be named without a reference.)
export * from './message';
export * from './relations';
export * from './task';
