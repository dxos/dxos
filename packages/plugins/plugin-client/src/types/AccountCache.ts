//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

const AccountCacheValue = Schema.Struct({
  identityDid: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  /** ISO timestamp. */
  createdAt: Schema.String,
  invitationsRemaining: Schema.Number,
});
export type AccountCacheValue = Schema.Schema.Type<typeof AccountCacheValue>;

const AccountCacheInvitation = Schema.Struct({
  code: Schema.String,
  /** ISO timestamp. */
  createdAt: Schema.String,
  redeemedByIdentityDid: Schema.optional(Schema.String),
  /** ISO timestamp. */
  redeemedAt: Schema.optional(Schema.String),
});
export type AccountCacheInvitation = Schema.Schema.Type<typeof AccountCacheInvitation>;

export const AccountCache = Schema.Struct({
  account: Schema.optional(AccountCacheValue),
  invitations: Schema.optional(Schema.Array(AccountCacheInvitation)),
  /** Epoch ms when the cache was last refreshed. */
  fetchedAt: Schema.optional(Schema.Number),
});
export type AccountCache = Schema.Schema.Type<typeof AccountCache>;
