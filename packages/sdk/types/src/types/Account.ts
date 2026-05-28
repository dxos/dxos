//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import * as AccessToken from './AccessToken';
import * as Provider from './Provider';

/**
 * A user's account / membership with an external service.
 * Used for loyalty programs (frequent flyer, hotel rewards), travel profiles,
 * and any non-credential identity at a third-party provider.
 * Distinct from AccessToken, which holds the API credential.
 */
export const Account = Schema.Struct({
  provider: Provider.Provider,
  kind: Schema.Literal('airline', 'rail', 'hotel', 'car', 'cruise', 'travel', 'other').pipe(Schema.optional),
  accountNumber: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  tier: Schema.optional(Schema.String),
  status: Schema.Literal('active', 'expired').pipe(Schema.optional),
  notes: Schema.optional(Schema.String),
  accessTokens: Schema.Array(Ref.Ref(AccessToken.AccessToken)).pipe(Schema.optional),
}).pipe(
  Type.object(DXN.make('org.dxos.type.account', '0.1.0')),
  LabelAnnotation.set(['displayName']),
  Annotation.IconAnnotation.set({
    icon: 'ph--identification-card--regular',
    hue: 'teal',
  }),
);

export interface Account extends Schema.Schema.Type<typeof Account> {}

export const instanceOf = (value: unknown): value is Account => Obj.instanceOf(Account, value);

export const make = (props: Obj.MakeProps<typeof Account>) => Obj.make(Account, props);
