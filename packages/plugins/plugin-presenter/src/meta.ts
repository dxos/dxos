//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const PRESENTER_PLUGIN = 'dxos.org/plugin/presenter';

export default {
  id: PRESENTER_PLUGIN,
  name: 'Presenter',
  description: 'Present documents as slideshows.',
  icon: 'ph--presentation--regular',
} satisfies PluginMeta;
