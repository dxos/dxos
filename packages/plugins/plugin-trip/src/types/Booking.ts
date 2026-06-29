//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
// Organization is referenced in the inferred type of Booking (via Provider.Provider → Ref.Ref(Organization));
// the import lets TypeScript name it in the emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Account, type Organization, Provider } from '@dxos/types';

/**
 * A purchased ticket or reservation.
 * One Booking may back multiple Segments (e.g., round-trip under one PNR).
 */
export class Booking extends Type.makeObject<Booking>(DXN.make('org.dxos.type.trip.booking', '0.1.0'))(
  Schema.Struct({
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
  ),
) {}

export const instanceOf = (value: unknown): value is Booking => Obj.instanceOf(Booking, value);

export const make = (props: Partial<Obj.MakeProps<typeof Booking>> = {}): Booking => Obj.make(Booking, { ...props });
