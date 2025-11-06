//
// Copyright 2025 DXOS.org
//

import { type Type } from '@dxos/echo';
import { StoredSchema as StoredSchema$ } from '@dxos/echo/internal';

/**
 * Common data types.
 * https://schema.org/docs/schemas.html
 */

import * as DataType from './DataType';

export * as DataType from './DataType';
export { StoredSchema } from '@dxos/echo/internal';

export const DataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  // TODO(wittjosiah): Introduce a generic canvas type which stores data using OCIF (https://www.canvasprotocol.org/).
  StoredSchema$,

  // System
  DataType.Collection.Collection,
  DataType.Collection.QueryCollection,
  DataType.Text.Text,
  DataType.View.View,

  // Objects
  DataType.AccessToken.AccessToken,
  DataType.Event.Event,
  DataType.Organization.Organization,
  DataType.Person.Person,
  DataType.Project.Project,
  DataType.Task.Task,

  // Relations
  DataType.AnchoredTo.AnchoredTo,
  DataType.Employer.Employer,
  DataType.HasConnection.HasConnection,
  DataType.HasRelationship.HasRelationship,
  DataType.HasSubject.HasSubject,
];
