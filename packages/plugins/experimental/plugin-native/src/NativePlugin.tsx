//
// Copyright 2023 DXOS.org
//

import type { PluginsContext } from '@dxos/app-framework';
import { definePlugin, Events, defineModule } from '@dxos/app-framework';

import { meta } from './meta';

// TODO(burdon): Initial url has index.html, which must be caught/redirected.

export const NativePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/startup`,
      activatesOn: Events.DispatcherReady,
      activate: async (context: PluginsContext) => {
        const { initializeNativeApp } = await import('./initialize');
        await initializeNativeApp(context);
        return [];
      },
    }),
  ]);
