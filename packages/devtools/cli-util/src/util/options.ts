//
// Copyright 2025 DXOS.org
//

import * as Options from 'effect/unstable/cli/Flag';

import { Key } from '@dxos/echo';

//
// Common options.
// NOTE: Sub-commands should Function.pipe(Options.optional) if required.
//

export const Common = {
  functionId: Options.string('function-id').pipe(Options.withDescription('EDGE Function ID.')),
  spaceId: Options.string('space-id').pipe(Options.withSchema(Key.SpaceId), Options.withDescription('Space ID.')),
};
