//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as ConfigProvider from 'effect/ConfigProvider';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { identity } from './identity';
import { space } from './space';

export const admin = Command.make('admin', {
  adminKey: Options.text('admin-key').pipe(
    Options.withDescription('Edge admin key (or DX_HUB_API_KEY env var).'),
    Options.withAlias('k'),
    Options.optional,
  ),
  edgeUrl: Options.text('edge-url').pipe(
    Options.withDescription('Edge worker base URL (or DX_EDGE_BASE_URL env var).'),
    Options.withAlias('u'),
    Options.optional,
  ),
}).pipe(
  Command.withDescription('Edge admin commands.'),
  Command.withSubcommands([space, identity]),
  Command.provide(
    Effect.fnUntraced(function* ({ adminKey, edgeUrl }) {
      const parentProvider = yield* Effect.configProviderWith(Effect.succeed);

      const overrides: Record<string, string> = {};
      Option.map(adminKey, (value) => (overrides.DX_HUB_API_KEY = value));
      Option.map(edgeUrl, (value) => (overrides.DX_EDGE_BASE_URL = value));

      const childProvider = ConfigProvider.fromJson(overrides);
      const provider = childProvider.pipe(ConfigProvider.orElse(() => parentProvider));

      return Layer.setConfigProvider(provider);
    }, Layer.unwrapEffect),
  ),
);
