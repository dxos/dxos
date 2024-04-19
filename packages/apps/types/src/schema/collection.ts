//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class Collection extends TypedObject({ typename: 'dxos.Collection', version: '0.1.0' })({
  name: S.optional(S.string),
  objects: S.mutable(S.array(ref(Expando))),
  // Where key is the typename of the view schema.
  // TODO(wittjosiah): Any way to make this more type safe?
  views: S.mutable(S.record(S.string, ref(Expando))),
}) {}
