//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { FileCapabilities, FileType, MAX_FILE_SIZE, Settings, isAcceptedMimeType } from '#types';

import { FileTooLargeError, UnsupportedFileTypeError } from '../operations/create';

/**
 * Inline backend: file bytes are stored on the ECHO object itself.
 * Exported standalone for direct testing.
 */
export const inlineBackend: FileCapabilities.Backend = {
  id: Settings.DEFAULT_BACKEND_ID,
  name: 'Inline (ECHO)',
  description: 'Store the file bytes directly inside the ECHO document. Capped at 4MB; images and PDFs only.',
  upload: async (file) => {
    if (!isAcceptedMimeType(file.type)) {
      throw new UnsupportedFileTypeError(file.type);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > MAX_FILE_SIZE) {
      throw new FileTooLargeError(bytes.byteLength);
    }
    return {
      name: file.name,
      type: file.type,
      size: bytes.byteLength,
      data: FileType.inlineData(bytes),
    };
  },
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(FileCapabilities.Backend, inlineBackend)),
);
