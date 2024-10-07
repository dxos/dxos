//
// Copyright 2024 DXOS.org
//

import { TYPE_PROPERTIES, TypedObject, S } from '@dxos/echo-schema';

// TODO(burdon): Factor out (co-locate with TYPE_PROPERTIES).
export class PropertiesType extends TypedObject({
  typename: TYPE_PROPERTIES,
  version: '0.1.0',
})(
  {
    name: S.optional(S.String),
  },
  { record: true },
) {}

// TODO(burdon): Remove? Use PropertiesType instead?
export type PropertiesTypeProps = Pick<PropertiesType, 'name'>;
