//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
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
    invocationTraceQueue: Schema.optional(Type.Ref(Queue)),
  },
  { record: true },
) {}

// TODO(burdon): Remove? Use PropertiesType instead?
export type PropertiesTypeProps = Pick<PropertiesType, 'name' | 'hue' | 'icon' | 'invocationTraceQueue'>;
