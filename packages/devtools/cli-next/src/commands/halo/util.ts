//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '../../util';

/**
 * Pretty prints an identity with ANSI colors.
 */
export const printIdentity = (identity: { identityKey: { toHex(): string }; profile?: { displayName?: string } }) =>
  FormBuilder.of({ title: 'Identity' })
    .set({ key: 'identityKey', value: identity.identityKey.toHex() })
    .set({ key: 'displayName', value: identity.profile?.displayName ?? '<none>' })
    .build();
