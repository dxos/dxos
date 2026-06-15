//
// Copyright 2025 DXOS.org
//

import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

const JSON_EXTENSIONS = ['.dx.json', '.dx.json.gz', '.json'];
const BINARY_EXTENSIONS = ['.tar', '.tar.gz'];

/**
 * Detect the format of a space archive.
 *
 * Uses filename extension as the primary signal, and falls back to sniffing
 * the first bytes of the archive contents to distinguish JSON from tar.
 */
export const detectSpaceArchiveFormat = (archive: Pick<SpaceArchive, 'filename' | 'contents'>): SpaceArchive.Format => {
  const filename = archive.filename?.toLowerCase() ?? '';
  if (JSON_EXTENSIONS.some((ext) => filename.endsWith(ext))) {
    return SpaceArchive.Format.JSON;
  }
  if (BINARY_EXTENSIONS.some((ext) => filename.endsWith(ext))) {
    return SpaceArchive.Format.BINARY;
  }

  // Fall back to byte sniffing: JSON archives start with '{' (0x7B) or whitespace.
  const bytes = archive.contents;
  if (bytes && bytes.length > 0) {
    for (let i = 0; i < Math.min(bytes.length, 16); i++) {
      const byte = bytes[i];
      // Skip whitespace.
      if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d) {
        continue;
      }
      if (byte === 0x7b /* '{' */) {
        return SpaceArchive.Format.JSON;
      }
      break;
    }
  }

  return SpaceArchive.Format.BINARY;
};
