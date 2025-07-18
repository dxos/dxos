//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { ObjectId, LabelAnnotation } from '@dxos/echo-schema';

// TODO(burdon): Move out of react-ui-xxx.
export const TableView = Schema.Struct({
  id: ObjectId,
  name: Schema.optional(Schema.String),
})
  .pipe(LabelAnnotation.set(['name']))
  .pipe(Type.Obj({ typename: 'dxos.org/type/Table', version: '0.1.0' }));
export interface TableView extends Schema.Schema.Type<typeof TableView> {}
