//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { PublicKey } from '@dxos/keys';

import { type PublicKey as BufPublicKey, PublicKeySchema } from './proto/gen/dxos/keys_pb.ts';

export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';

export { create as createBuf } from '@bufbuild/protobuf';

/**
 * Reads `dxos.keys.PublicKey` as the domain key type.
 *
 * buf generates the key as an ordinary message where protobuf.js substituted the `PublicKey`
 * class, so buf-native code converts explicitly. This is the direction of travel — not a compat
 * shim — and it is shared so the substitution is spelled one way everywhere.
 */
export const toPublicKey = (key: BufPublicKey | undefined): PublicKey | undefined => key && PublicKey.from(key.data);

/** Writes the domain key type as `dxos.keys.PublicKey`. */
export const fromPublicKey = (key: PublicKey): BufPublicKey => create(PublicKeySchema, { data: key.asUint8Array() });
