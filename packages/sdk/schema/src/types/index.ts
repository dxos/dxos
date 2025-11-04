//
// Copyright 2025 DXOS.org
//

import type { Type } from '@dxos/echo';

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */
import * as DataType from './DataType';

// TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).

export * as DataType from './DataType';

export const DataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  // Objects
  DataType.AccessToken.AccessToken,
  DataType.Collection.Collection,
  DataType.Collection.QueryCollection,
  DataType.Event.Event,
  DataType.Organization.Organization,
  DataType.Person.Person,
  DataType.Project.Project,
  DataType.StoredSchema,
  DataType.Task.Task,
  DataType.Text.Text,
  DataType.View.View,

  // Relations
  DataType.AnchoredTo.AnchoredTo,
  DataType.Employer.Employer,
  DataType.HasConnection.HasConnection,
  DataType.HasRelationship.HasRelationship,
  DataType.HasSubject.HasSubject,
];
