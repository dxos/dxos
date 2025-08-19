//
// Copyright 2025 DXOS.org
//

import { Options } from '@effect/cli';

//
// Common options.
// NOTE: Sub-commands should pipe(Options.optional) if required.
//

export const Common = {
  apiKey: Options.text('api-key').pipe(
    Options.withDescription('API key.'),
    Options.withDefault(process.env['DX_API_KEY']),
  ),

  json: Options.boolean('json').pipe(Options.withDescription('Output in JSON format.')),
  timeout: Options.integer('timeout').pipe(
    Options.withDescription('The timeout before the command fails.'),
    Options.withDefault(5_000),
  ),

  spaceId: Options.text('spaceId').pipe(Options.withDescription('Space ID.')),
  typename: Options.text('typename').pipe(Options.withDescription('The typename to query.')),
  verbose: Options.boolean('verbose').pipe(Options.withDescription('Verbose logging.')),
};
