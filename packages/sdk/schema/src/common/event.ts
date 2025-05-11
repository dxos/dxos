//
// Copyright 2024 DXOS.org
//

import { Type } from '@dxos/echo';
import { Expando, Ref, S } from '@dxos/echo-schema';

import { Actor } from './actor';

/**
 * https://schema.org/Event
 */
// TODO(burdon): Fix.
const EventSchema = S.Struct({
  name: S.optional(S.String),
  owner: Actor,
  attendees: S.mutable(S.Array(Actor)),
  startDate: S.String, // TODO(burdon): Date.
  endDate: S.String,
  links: S.mutable(S.Array(Ref(Expando))),
});

export const Event = EventSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Event',
    version: '0.1.0',
  }),
);

export interface Event extends S.Schema.Type<typeof Event> {}
