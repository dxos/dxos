//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Blob } from '@dxos/echo';

import { FileCapabilities } from '#types';

/**
 * Inline backend descriptor: file bytes are stored on the ECHO object itself.
 * Exported standalone for direct testing.
 */
export const inlineBackend: FileCapabilities.Backend = {
  name: 'Inline (ECHO)',
  description: 'Store the file bytes directly inside the ECHO document. Capped at 4MB; images, videos, and PDFs only.',
  storage: Blob.Storage.inline,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(FileCapabilities.Backend, inlineBackend)),
);
