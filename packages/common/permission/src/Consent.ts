//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Principal from './Principal.ts';

export const Scope = Schema.Literals(['once', 'session', 'standing']);
export type Scope = Schema.Schema.Type<typeof Scope>;

/**
 * A principal's recorded answer to a grant's consent condition: the third-party caveat discharged.
 * `once` is consumed by the first check that uses it, which the source is responsible for.
 */
export const Consent = Schema.Struct({
  grantId: Schema.String,
  by: Principal.Principal,
  scope: Scope,
  grantedAt: Schema.Number,
  expiresAt: Schema.optional(Schema.Number),
}).pipe(Schema.annotate({ title: 'Consent' }));
export type Consent = Schema.Schema.Type<typeof Consent>;

export const decode = Schema.decodeUnknownSync(Consent);
export const encode = Schema.encodeSync(Consent);

export type MakeOptions = Omit<Consent, 'scope' | 'grantedAt'> & { scope?: Scope; grantedAt?: number };

export const make = ({ scope = 'once', grantedAt = Date.now(), ...rest }: MakeOptions): Consent =>
  decode({ ...rest, scope, grantedAt });

export const isActive = (consent: Consent, now: number = Date.now()): boolean =>
  consent.expiresAt === undefined || now < consent.expiresAt;
