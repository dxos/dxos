//
// Copyright 2025 DXOS.org
//

import * as ConfigProvider from 'effect/ConfigProvider';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { account } from './accounts';
import { code } from './codes';
import { status } from './status';
import { user } from './user';

export const hub = Command.make('hub', {
  apiKey: Options.string('api-key').pipe(Options.withDescription('API key.'), Options.optional),
}).pipe(
  Command.withDescription('Manage Hub.'),
  Command.provide(({ apiKey }) =>
    // `asPrimary` layers the flag over the ambient env provider rather than replacing it.
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown(
        Option.match(apiKey, { onNone: () => ({}), onSome: (apiKey) => ({ DX_HUB_API_KEY: apiKey }) }),
      ),
      { asPrimary: true },
    ),
  ),
  // After `provide`: `withSubcommands` widens `Input` to the union of this command's flags and every
  // subcommand's, which the provider callback cannot destructure.
  Command.withSubcommands([status, user, account, code]),
);
