//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '../../util';

/**
 * Pretty prints an identity with ANSI colors.
 */
export const printIdentity = (identity: {
  identityKey: { toHex(): string; truncate(): string };
  profile?: { displayName?: string };
}) =>
  FormBuilder.of({ title: 'Identity' })
    .set({ key: 'identityKey', value: identity.identityKey.truncate() })
    .set({ key: 'displayName', value: identity.profile?.displayName ?? '<none>' })
    .build();
