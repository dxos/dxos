//
// Copyright 2025 DXOS.org
//

import { Events, defineModule, definePlugin } from '@dxos/app-framework';

import { ReactSurface } from './capabilities';
import { meta } from './meta';

export const MasonryPlugin = definePlugin(meta, () => [
  // Translations module not required for initial draft.
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
]);
