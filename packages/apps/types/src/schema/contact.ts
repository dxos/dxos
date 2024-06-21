//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

// TODO(wittjosiah): Factor out to halo?
export class ContactType extends TypedObject({ typename: 'dxos.org/type/Contact', version: '0.1.0' })({
  name: S.optional(S.String),
  identifiers: S.mutable(
    S.Array(
      S.Struct({
        type: S.String,
        value: S.String,
      }),
    ),
  ),
}) {}
