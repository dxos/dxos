//
// Copyright 2023 DXOS.org
//

import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

export interface CredentialProcessor {
  processCredential(credential: Credential): Promise<void>;
}
