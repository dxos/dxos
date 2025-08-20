//
// Copyright 2025 DXOS.org
//

import { Options } from '@effect/cli';

//
// Common options.
// NOTE: Sub-commands should pipe(Options.optional) if required.
//

export const Common = {
  // TODO(wittjosiah): Migrate to nested Config.
  apiKey: Options.text('api-key').pipe(
    Options.withDescription('API key.'),
    Options.withDefault(process.env['DX_API_KEY']),
  ),

  // TODO(wittjosiah): Factor out to spaces sub-command?
  spaceId: Options.text('spaceId').pipe(Options.withDescription('Space ID.')),
  typename: Options.text('typename').pipe(Options.withDescription('The typename to query.')),
};
