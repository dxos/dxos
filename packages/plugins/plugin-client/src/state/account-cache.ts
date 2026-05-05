//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { createKvsStore } from '@dxos/effect';

const AccountCacheValue = Schema.Struct({
  identityKey: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  /** ISO timestamp. */
  createdAt: Schema.String,
  invitationsRemaining: Schema.Number,
});
type AccountCacheValue = Schema.Schema.Type<typeof AccountCacheValue>;

const AccountCacheInvitation = Schema.Struct({
  code: Schema.String,
  /** ISO timestamp. */
  createdAt: Schema.String,
  redeemedByIdentityKey: Schema.optional(Schema.String),
  /** ISO timestamp. */
  redeemedAt: Schema.optional(Schema.String),
});
type AccountCacheInvitation = Schema.Schema.Type<typeof AccountCacheInvitation>;

const AccountCache = Schema.Struct({
  account: Schema.optional(AccountCacheValue),
  invitations: Schema.optional(Schema.Array(AccountCacheInvitation)),
  /** Epoch ms when the cache was last refreshed. */
  fetchedAt: Schema.optional(Schema.Number),
});
type AccountCache = Schema.Schema.Type<typeof AccountCache>;

/**
 * Local-storage-backed cache of the signed-in account's profile + issued
 * invitations. Containers render from this immediately on load and trigger a
 * background refresh; on offline reload the cache survives.
 */
export const accountCacheAtom = createKvsStore<AccountCache>({
  key: 'composer.account',
  schema: AccountCache,
  defaultValue: () => ({}),
});

export type { AccountCache, AccountCacheInvitation, AccountCacheValue };
