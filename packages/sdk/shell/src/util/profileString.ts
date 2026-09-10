//
// Copyright 2025 DXOS.org
//

import { type Identity } from '@dxos/react-client/halo';

/**
 * Reads a string out of the profile's `google.protobuf.Struct` metadata.
 *
 * The field holds arbitrary JSON, so a caller wanting a string has to check rather than assume.
 */
export const profileString = (identity: Identity | undefined, key: string): string | undefined => {
  const value = identity?.profile?.data?.[key];
  return typeof value === 'string' ? value : undefined;
};
