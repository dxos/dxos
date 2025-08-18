//
// Copyright 2025 DXOS.org
//

import { Options } from '@effect/cli';

//
// Common options.
// NOTE: Sub-commands should pipe(Options.optional) if required.
//

export const Common = {
  json: Options.boolean('json').pipe(Options.withDescription('Output in JSON format.')),
  timeout: Options.integer('timeout').pipe(
    Options.withDescription('The timeout before the command fails.'),
    Options.withDefault(5_000),
  ),

  spaceId: Options.text('spaceId').pipe(Options.withDescription('Space ID.')),
  typename: Options.text('typename').pipe(Options.withDescription('The typename to query.')),
};
