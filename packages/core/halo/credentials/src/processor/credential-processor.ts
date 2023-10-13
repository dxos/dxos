//
// Copyright 2023 DXOS.org
//

import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

export interface CredentialProcessor {
  processCredential(credential: Credential): Promise<void>;
}
