//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Replace instanceof checks.
// TODO(burdon): Remove Type suffix from other type defs (after API changes).
// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).

import type { Type } from '@dxos/echo';

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */
import * as DataType from './DataType';

export * as DataType from './DataType';

export const DataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  // Objects
  DataType.AccessToken.AccessToken,
  DataType.Collection.Collection,
  DataType.Event.Event,
  DataType.Organization.Organization,
  DataType.Person.Person,
  DataType.Project.Project,
  DataType.Collection.QueryCollection,
  DataType.StoredSchema,
  DataType.Task.Task,
  DataType.Text.Text,
  DataType.View,

  // Relations
  DataType.AnchoredTo.AnchoredTo,
  DataType.Employer.Employer,
  DataType.HasConnection.HasConnection,
  DataType.HasRelationship.HasRelationship,
  DataType.HasSubject.HasSubject,
];

// TODO(burdon): Remove (fix The inferred type of 'DeleteMessage' cannot be named without a reference.)
export * from './message';
export * from './relations';
export * from './task';
