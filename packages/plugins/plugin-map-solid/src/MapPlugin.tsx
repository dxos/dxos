//
// Copyright 2023 DXOS.org
//

import { Events, defineModule, definePlugin } from '@dxos/app-framework';

import { Surface } from './capabilities';
import { meta } from './meta';

export const MapPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/surface`,
    activatesOn: Events.SetupReactSurface,
    activate: Surface,
  }),
]);
