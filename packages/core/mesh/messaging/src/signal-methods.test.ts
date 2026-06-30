//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getPeerIdentityDid } from './signal-methods';

describe('getPeerIdentityDid', () => {
  test('prefers identityDid when present', ({ expect }) => {
    expect(getPeerIdentityDid({ peerKey: 'p', identityDid: 'did:halo:abc' })).toEqual('did:halo:abc');
  });

  test('returns undefined when only the legacy hex identityKey is set', ({ expect }) => {
    // Hex→DID derivation is async and owned by callers; the helper only surfaces the canonical field.
    expect(getPeerIdentityDid({ peerKey: 'p', identityKey: 'deadbeef' })).toBeUndefined();
  });
});
