//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { status } from './status';
import { user } from './user';

export const hub = Command.make('hub', {
  apiKey: Options.text('api-key').pipe(Options.withDescription('API key.'), Options.optional),
}).pipe(
  Command.withDescription('Manage Hub.'),
  Command.withSubcommands([status, user]),
  Command.provide(
    Effect.fnUntraced(function* ({ apiKey }) {
      const parentProvider = yield* Effect.configProviderWith(Effect.succeed);

      const childProvider = Option.match(apiKey, {
        onNone: () => ConfigProvider.fromJson({}),
        onSome: (apiKey) => ConfigProvider.fromJson({ DX_HUB_API_KEY: apiKey }),
      });

      const provider = childProvider.pipe(ConfigProvider.orElse(() => parentProvider));

      return Layer.setConfigProvider(provider);
    }, Layer.unwrapEffect),
  ),
);
