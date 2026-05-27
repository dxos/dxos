//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.preview'),
  name: 'Preview',
  author: 'DXOS',
  description: trim`
    Rich preview panel for viewing object content without opening full editors.
    Quick peek at documents, images, and data with inline rendering.
  `,
  icon: 'ph--eye--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-preview',
  tags: ['system'],
};
