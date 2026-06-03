//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';

/**
 * Pretty prints an identity with ANSI colors.
 */
export const printIdentity = (identity: { identityDid: string; profile?: { displayName?: string } }) =>
  FormBuilder.make({ title: 'Identity' }).pipe(
    FormBuilder.set('identityDid', identity.identityDid),
    FormBuilder.set('displayName', identity.profile?.displayName ?? '<none>'),
    FormBuilder.build,
  );
