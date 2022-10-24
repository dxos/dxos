//
// Copyright 2021 DXOS.org
//

import type { Codec } from './codec';

/**
 * Protobuf codec returns instances of Uint8Arrays, but some storages expect to receive Buffers.
 * This function patches the encode method to convert result into a Buffer.
 */
export const patchBufferCodec = (codec: Codec<any>) => ({
  encode: (x: any) => Buffer.from(codec.encode(x)),
  decode: codec.decode.bind(codec)
});
