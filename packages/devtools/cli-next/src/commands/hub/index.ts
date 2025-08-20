//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { ConfigProvider, Effect, Layer, Option } from 'effect';

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
