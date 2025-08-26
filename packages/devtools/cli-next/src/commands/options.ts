//
// Copyright 2025 DXOS.org
//

import { Options } from '@effect/cli';

//
// Common options.
// NOTE: Sub-commands should pipe(Options.optional) if required.
//

export const Common = {
  spaceId: Options.text('space-id').pipe(Options.withDescription('Space ID.')),
};
