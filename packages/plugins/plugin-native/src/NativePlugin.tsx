//
// Copyright 2023 DXOS.org
//

import { definePlugin, Events, defineModule } from '@dxos/app-framework';

import { Updater } from './capabilities';
import { meta } from './meta';

export const NativePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/updater`,
      activatesOn: Events.DispatcherReady,
      activate: Updater,
    }),
  ]);
