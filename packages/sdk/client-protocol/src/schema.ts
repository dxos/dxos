//
// Copyright 2024 DXOS.org
//

import { S, TYPE_PROPERTIES, TypedObject } from '@dxos/echo-schema';

export class PropertiesType extends TypedObject({ typename: TYPE_PROPERTIES, version: '0.1.0' })(
  {
    name: S.optional(S.String),
  },
  { record: true },
) {}

// TODO(burdon): Rename?
export type PropertiesTypeProps = Pick<PropertiesType, 'name'>;
