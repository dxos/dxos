//
// Copyright 2022 DXOS.org
//

import { SignRequest, SignResponse } from '@dxos/protocols/proto/dxos/client/services';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keys';

/**
 *
 */
// TODO(burdon): Reconcile with CredentialsSigner.
export interface HaloSigner {
  sign: (request: SignRequest, key: KeyRecord) => Promise<SignResponse>;
}
