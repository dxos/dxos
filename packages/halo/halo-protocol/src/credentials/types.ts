//
// Copyright 2022 DXOS.org
//

import { TypedProtoMessage } from '@dxos/codec-protobuf';
import { TYPES } from '../proto/gen';
import { Credential } from '../proto/gen/dxos/halo/credentials';

/**
 * Union of all protobuf types with the '@type' field included.
 *
 * Useful for typing 'google.protobuf.Any' messages.
 */
export type MessageType = TypedProtoMessage<TYPES>

export const getCredentialAssertion = (credential: Credential): MessageType => credential.subject.assertion;
