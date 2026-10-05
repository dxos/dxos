//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';

import * as RegistryOperation from '../types/RegistryOperation.ts';

const handler: Operation.WithHandler<typeof RegistryOperation.LoadPlugin> = RegistryOperation.LoadPlugin.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ url, enable = true }) {
      const manager = yield* Plugin.Service;
      const plugin = yield* manager.add(url.trim());
      if (enable) {
        yield* manager.enable(plugin.meta.profile.key);
      }
      return { id: plugin.meta.profile.key, name: plugin.meta.profile.name };
    }),
  ),
);

export default handler;
