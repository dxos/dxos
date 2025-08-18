//
// Copyright 2025 DXOS.org
//

import { Options } from '@effect/cli';

//
// Common options.
//

export const json = Options.boolean('json').pipe(Options.withDescription('Output in JSON format.'));

export const spaceId = Options.text('spaceId').pipe(Options.withDescription('Space ID.'), Options.optional);
