//
// Copyright 2026 DXOS.org
//

import CRC32 from 'crc-32';

import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';

const EchoMetadataCodec = schema.getCodecForType('dxos.echo.metadata.EchoMetadata');

/**
 * Strips CRC32 framing used by SqliteMetadataStore (8-byte header + payload).
 *
 * @param {Uint8Array | Buffer} bytes
 * @returns {Uint8Array | null}
 */
export const stripMetadataFraming = (bytes) => {
  const buf = Buffer.from(bytes);
  if (buf.length < 8) {
    return null;
  }

  const dataSize = buf.readInt32LE(0);
  const checksum = buf.readInt32LE(4);
  if (dataSize < 0 || dataSize > buf.length - 8 || buf.length !== dataSize + 8) {
    return null;
  }

  const payload = buf.subarray(8, dataSize + 8);
  if (CRC32.buf(payload) !== checksum) {
    return null;
  }

  return new Uint8Array(payload);
};

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {import('@dxos/protocols/proto').TYPES['dxos.echo.metadata.EchoMetadata'] | null}
 */
export const decodeEchoMetadata = (bytes) => {
  const payload = stripMetadataFraming(bytes);
  if (!payload?.length) {
    return null;
  }
  return EchoMetadataCodec.decode(payload);
};

/**
 * @param {import('@dxos/protocols/proto').TYPES['dxos.keys.PublicKey'] | undefined} key
 * @returns {string | undefined}
 */
export const formatPublicKey = (key) => {
  if (!key?.data) {
    return undefined;
  }
  return PublicKey.from(key.data).truncate();
};

/**
 * @param {import('@dxos/protocols/proto').TYPES['dxos.echo.metadata.SpaceMetadata'] | undefined} space
 * @returns {{ key: string | undefined, state: string | undefined, feedCount: number }}
 */
export const summarizeSpace = (space) => ({
  key: formatPublicKey(space?.key),
  state: space?.state != null ? String(space.state) : undefined,
  feedCount: space?.feedKeys?.length ?? 0,
});
