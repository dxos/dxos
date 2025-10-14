//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Clashes with sdk/view.
export class ViewType extends TypedObject({
  typename: 'dxos.org/type/ExplorerView',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  type: Schema.String,
}) {}
