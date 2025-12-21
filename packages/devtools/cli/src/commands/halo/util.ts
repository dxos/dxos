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
  FormBuilder.make({ title: 'Identity' }).pipe(
    FormBuilder.set('identityKey', identity.identityKey.truncate()),
    FormBuilder.set('displayName', identity.profile?.displayName ?? '<none>'),
    FormBuilder.build
  );
