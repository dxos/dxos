//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Principal from './Principal.ts';

/**
 * Withdraws a grant by id. Valid when signed by the issuer of that grant or of any ancestor in its
 * chain; `check` treats a revoked grant as absent.
 */
export const Revocation = Schema.Struct({
  grantId: Schema.String,
  issuer: Principal.Principal,
  reason: Schema.optional(Schema.String),
  issuedAt: Schema.optional(Schema.Number),
}).pipe(Schema.annotate({ title: 'Revocation' }));
export type Revocation = Schema.Schema.Type<typeof Revocation>;

export const decode = Schema.decodeUnknownSync(Revocation);
export const encode = Schema.encodeSync(Revocation);

export const make = (revocation: Revocation): Revocation => decode(revocation);
