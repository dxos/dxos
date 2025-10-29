//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/preview',
  name: 'Preview',
  description: trim`
    Rich preview panel for viewing object content without opening full editors.
    Quick peek at documents, images, and data with inline rendering.
  `,
  icon: 'ph--eye--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-preview',
};
