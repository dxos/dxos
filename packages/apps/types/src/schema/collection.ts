//
// Copyright 2024 DXOS.org
//

import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';

export class Collection extends TypedObject({ typename: 'dxos.Collection', version: '0.1.0' })({
  name: S.optional(S.string),
  objects: S.mutable(S.array(ref(Expando))),
  // Key is schema typename and value is reference to a view object of the associated schema.
  // Having collection reference the views rather than vice versa ensures that the state converges to a single view per key (i.e. type).
  // This also leaves open a future where this key could be changed to allow for multiple stack views per section.
  // TODO(wittjosiah): Any way to make this more type safe?
  // TODO(wittjosiah): Should the views be separate objects or just be schemas for view data in this record?
  views: S.mutable(S.record(S.string, ref(Expando))),
}) {}
