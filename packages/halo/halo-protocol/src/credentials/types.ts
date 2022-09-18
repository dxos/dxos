//
// Copyright 2022 DXOS.org
//

import { TYPES } from '@dxos/protocols';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 * Discriminated union of all protobuf types with the '@type' field included.
 * Useful for typing 'google.protobuf.Any' messages.
 */
// TODO(burdon): Remove.
export type MessageType = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K }
}[keyof TYPES]

export const getCredentialAssertion = (credential: Credential): MessageType => credential.subject.assertion;
