//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { Account, Provider } from '@dxos/types';

/**
 * A purchased ticket or reservation.
 * One Booking may back multiple Segments (e.g., round-trip under one PNR).
 */
export const Booking = Schema.Struct({
  provider: Provider.Provider.pipe(Schema.optional),
  confirmationCode: Schema.optional(Schema.String),
  bookedUnder: Ref.Ref(Account.Account).pipe(Schema.optional),
  passengers: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      account: Ref.Ref(Account.Account).pipe(Schema.optional),
    }),
  ).pipe(Schema.optional),
  currency: Schema.optional(Schema.String),
  totalPrice: Schema.optional(Schema.Number),
  purchasedAt: Schema.optional(Schema.String),
  source: Schema.Literal('manual', 'email', 'agent', 'import').pipe(Schema.optional),
  rawPayload: Schema.optional(Schema.String),
}).pipe(
  LabelAnnotation.set(['confirmationCode']),
  Annotation.IconAnnotation.set({ icon: 'ph--ticket--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.trip.booking', '0.1.0')),
);

export interface Booking extends Type.InstanceType<typeof Booking> {}

export const instanceOf = (value: unknown): value is Booking => Obj.instanceOf(Booking, value);

export const make = (props: Partial<Obj.MakeProps<typeof Booking>> = {}): Booking => Obj.make(Booking, { ...props });
