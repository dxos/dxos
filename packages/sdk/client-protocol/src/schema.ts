//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { TYPE_PROPERTIES, TypedObject } from '@dxos/echo-schema';

export class TaskType extends TypedObject({
  typename: 'dxos.org/type/Task',
  version: '0.1.0',
})({
  name: S.String,
  completed: S.optional(S.Boolean),
}) {}

// TODO(burdon): Factor out (co-locate with TYPE_PROPERTIES).
export class PropertiesType extends TypedObject({
  typename: TYPE_PROPERTIES,
  version: '0.1.0',
})(
  {
    name: S.optional(S.String),
  },
  // { record: true },
) {}

// TODO(burdon): Remove? Use PropertiesType instead?
export type PropertiesTypeProps = Pick<PropertiesType, 'name'>;
