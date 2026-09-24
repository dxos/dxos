//
// Copyright 2025 DXOS.org
//

import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/**
 * Names a credential's assertion for display.
 *
 * The assertion is a packed `google.protobuf.Any`, so its type lives in `typeUrl` rather than in
 * the value; the prefix (`type.googleapis.com/`) is dropped to match how the proto names it.
 */
export const assertionTypeName = (credential: Credential | undefined): string => {
  const typeUrl = credential?.subject?.assertion?.typeUrl;
  return typeUrl ? typeUrl.slice(typeUrl.lastIndexOf('/') + 1) : 'unknown_type';
};
