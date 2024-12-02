//
// Copyright 2024 DXOS.org
//

import { TYPE_PROPERTIES, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Wire up class and remove TYPE_PROPERTIES from echo-schema and echo-db (@dima).
export class SpaceProperties extends TypedObject({
  typename: TYPE_PROPERTIES,
  version: '0.1.0',
})({
  // TODO(burdon): Create annotation and remove 'name' dependency from app-graph.
  name: S.String,
  description: S.optional(S.String),
  // TODO(burdon): Adapt existing expando props.
  custom: S.mutable(S.Record({ key: S.String, value: S.Any })),
  // TODO(burdon): Add avatar.
}) {}
