//
// Copyright 2024 DXOS.org
//

import { S, TypedObject, Ref, Expando } from '@dxos/echo-schema';

export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

// TODO(burdon): Factor out (co-locate with TYPE_PROPERTIES).
export class PropertiesType extends TypedObject({
  typename: TYPE_PROPERTIES,
  version: '0.1.0',
})(
  {
    name: S.optional(S.String),
    invocationTraceQueue: S.optional(Ref(Expando)),
  },
  { record: true },
) {}

// TODO(burdon): Remove? Use PropertiesType instead?
export type PropertiesTypeProps = Pick<PropertiesType, 'name' | 'invocationTraceQueue'>;
