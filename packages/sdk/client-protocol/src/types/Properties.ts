//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';

export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

// TODO(burdon): Factor out (co-locate with TYPE_PROPERTIES).
export class PropertiesType extends TypedObject({
  typename: TYPE_PROPERTIES,
  version: '0.1.0',
})(
  {
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Make generic?
    hue: Schema.optional(Schema.String),
    icon: Schema.optional(Schema.String),
    invocationTraceQueue: Schema.optional(Type.Ref(Obj.Any)),
  },
  { record: true },
) {}

// TODO(burdon): Remove? Use PropertiesType instead?
export type PropertiesTypeProps = Pick<PropertiesType, 'name' | 'hue' | 'icon' | 'invocationTraceQueue'>;
