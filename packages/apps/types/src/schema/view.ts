//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Standardize views?
export class ViewType extends TypedObject({ typename: 'dxos.org/type/View', version: '0.1.0' })({
  name: S.optional(S.String),
  type: S.String,
}) {}
