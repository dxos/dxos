//
// Copyright 2025 DXOS.org
//

import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
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
  Command.withSubcommands([status, user, account, code]),
  Command.provide(
    Effect.fnUntraced(function* ({ apiKey }) {
      const parentProvider = yield* Effect.configProviderWith(Effect.succeed);

      const childProvider = Option.match(apiKey, {
        onNone: () => ConfigProvider.fromUnknown({}),
        onSome: (apiKey) => ConfigProvider.fromUnknown({ DX_HUB_API_KEY: apiKey }),
      });

      const provider = childProvider.pipe(ConfigProvider.orElse(() => parentProvider));

      return Layer.setConfigProvider(provider);
    }, Layer.unwrap),
  ),
);
