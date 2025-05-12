//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';

import { Actor } from './actor';

/**
 * https://schema.org/Event
 */
// TODO(burdon): Fix.
const EventSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  owner: Actor,
  attendees: Schema.mutable(Schema.Array(Actor)),
  startDate: Schema.String, // TODO(burdon): Date.
  endDate: Schema.String,
  links: Schema.mutable(Schema.Array(Type.Ref(Type.Expando))),
});

export const Event = EventSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Event',
    version: '0.1.0',
  }),
);

export interface Event extends Schema.Schema.Type<typeof Event> {}
