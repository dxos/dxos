//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';
import { ActorSchema } from '@dxos/plugin-space/types';

export class EventType extends TypedObject({ typename: 'dxos.org/type/Event', version: '0.1.0' })({
  name: S.optional(S.String),
  owner: ActorSchema,
  attendees: S.mutable(S.Array(ActorSchema)),
  startDate: S.String,
  links: S.mutable(S.Array(Ref(Expando))),
}) {}

export class CalendarType extends TypedObject({ typename: 'dxos.org/type/Calendar', version: '0.1.0' })({}) {}
