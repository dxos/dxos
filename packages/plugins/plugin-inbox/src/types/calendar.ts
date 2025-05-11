//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export class EventType extends TypedObject({ typename: 'dxos.org/type/Event', version: '0.1.0' })({
  name: S.optional(S.String),
  owner: DataType.Actor,
  attendees: S.mutable(S.Array(DataType.Actor)),
  startDate: S.String,
  links: S.mutable(S.Array(Ref(Expando))),
}) {}

export class CalendarType extends TypedObject({ typename: 'dxos.org/type/Calendar', version: '0.1.0' })({}) {}
