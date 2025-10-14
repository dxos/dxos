//
// Copyright 2025 DXOS.org
//

import * as Options from '@effect/cli/Options';

//
// Common options.
// NOTE: Sub-commands should Function.pipe(Options.optional) if required.
//

export const Common = {
  functionId: Options.text('function-id').pipe(Options.withDescription('EDGE Function ID.')),
  spaceId: Options.text('space-id').pipe(Options.withDescription('Space ID.')),
};
