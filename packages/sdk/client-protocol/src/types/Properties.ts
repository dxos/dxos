//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { SystemAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';

export const TYPE_PROPERTIES = 'dxos.org/type/Properties';

export const PropertiesType = Schema.Struct(
  {
    name: Schema.optional(Schema.String),
    // TODO(wittjosiah): Make generic?
    hue: Schema.optional(Schema.String),
    icon: Schema.optional(Schema.String),
    invocationTraceQueue: Schema.optional(Type.Ref(Queue)),
  },
  { key: Schema.String, value: Schema.Any },
).pipe(
  Type.Obj({
    typename: TYPE_PROPERTIES,
    version: '0.1.0',
  }),
  SystemAnnotation.set(true),
);
export type PropertiesType = Schema.Schema.Type<typeof PropertiesType>;

// TODO(burdon): Remove? Use PropertiesType instead?
export type PropertiesTypeProps = Pick<PropertiesType, 'name' | 'hue' | 'icon' | 'invocationTraceQueue'>;
