//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { Actor } from './actor';

/**
 * https://schema.org/Event
 */
export const Event = Schema.Struct({
  name: Schema.optional(Schema.String),
  owner: Actor,
  attendees: Schema.mutable(Schema.Array(Actor)),
  startDate: Schema.String, // TODO(burdon): Date.
  endDate: Schema.String,
  links: Schema.mutable(Schema.Array(Type.Ref(Type.Expando))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Event',
    version: '0.1.0',
  }),
);

export interface Event extends Schema.Schema.Type<typeof Event> {}

export const make = (props: Obj.MakeProps<typeof Event>) => Obj.make(Event, props);
