//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo/internal';

// TODO(burdon): Clashes with sdk/view.
export class ViewType extends TypedObject({
  typename: 'dxos.org/type/ExplorerView',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  type: Schema.String,
}) {}
