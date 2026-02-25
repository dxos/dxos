//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';
import { toPublicKey } from '@dxos/protocols/buf';

type PublicKeyLike = Parameters<typeof toPublicKey>[0];

/**
 * Pretty prints an identity with ANSI colors.
 */
export const printIdentity = (identity: {
  identityKey?: PublicKeyLike;
  profile?: { displayName?: string };
}) =>
  FormBuilder.make({ title: 'Identity' }).pipe(
    FormBuilder.set('identityKey', identity.identityKey ? toPublicKey(identity.identityKey).truncate() : '<none>'),
    FormBuilder.set('displayName', identity.profile?.displayName ?? '<none>'),
    FormBuilder.build,
  );
