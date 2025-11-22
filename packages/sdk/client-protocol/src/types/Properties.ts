//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';

export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

const PropertiesTypeBase = TypedObject({
  typename: TYPE_PROPERTIES,
  version: '0.1.0',
})(
  {
    //
    // User properties.
    //

    name: Schema.optional(Schema.String),
    icon: Schema.optional(Schema.String),
    hue: Schema.optional(Schema.String),

    //
    // System properties.
    //

    invocationTraceQueue: Schema.optional(Type.Ref(Queue)),
  },
  {
    record: true,
  },
) as unknown as Schema.SchemaClass<any>;

/**
 * Special properties for Space.
 */
export class PropertiesType extends PropertiesTypeBase {}

export type PropertiesTypeProps = Pick<
  InstanceType<typeof PropertiesType>,
  'name' | 'icon' | 'hue' | 'invocationTraceQueue'
>;
