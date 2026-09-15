//
// Copyright 2025 DXOS.org
//

import * as ConfigProvider from 'effect/ConfigProvider';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { identity } from './identity/index.ts';
import { space } from './space/index.ts';

export const admin = Command.make('admin', {
  adminKey: Options.string('admin-key').pipe(
    Options.withDescription('Edge admin key (or DX_HUB_API_KEY env var).'),
    Options.withAlias('k'),
    Options.optional,
  ),
  edgeUrl: Options.string('edge-url').pipe(
    Options.withDescription('Edge worker base URL (or DX_EDGE_BASE_URL env var).'),
    Options.withAlias('u'),
    Options.optional,
  ),
}).pipe(
  Command.withDescription('Edge admin commands.'),
  Command.provide(({ adminKey, edgeUrl }) => {
    const overrides: Record<string, string> = {};
    Option.map(adminKey, (value) => (overrides.DX_HUB_API_KEY = value));
    Option.map(edgeUrl, (value) => (overrides.DX_EDGE_BASE_URL = value));

    // `asPrimary` layers the flags over the ambient env provider rather than replacing it, which is
    // what the explicit `orElse(parentProvider)` chain used to do by hand.
    return ConfigProvider.layerAdd(ConfigProvider.fromUnknown(overrides), { asPrimary: true });
  }),
  // After `provide`: `withSubcommands` widens `Input` to the union of this command's flags and every
  // subcommand's, which the provider callback cannot destructure.
  Command.withSubcommands([space, identity]),
);
