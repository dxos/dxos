//
// Copyright 2022 DXOS.org
//

import { TYPES } from './proto/gen';
import { Credential } from './proto/gen/dxos/halo/credentials';

export type MessageType = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K }
}[keyof TYPES]

export const getCredentialAssertion = (credential: Credential): MessageType => credential.subject.assertion;