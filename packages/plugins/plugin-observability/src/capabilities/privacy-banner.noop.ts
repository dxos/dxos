//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

// A host with a layout renders `privacy-notice`'s toast instead; printing to stderr as well would
// tell the same person twice.
export default Capability.makeModule(() => Effect.succeed([]));
