//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/theme-editor',
  name: 'Theme editor',
  description: trim`
    Visual theme customization tool for designing and modifying workspace appearance.
    Edit colors, typography, and component styles with live preview and JSON export.
  `,
  icon: 'ph--palette--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-theme-editor',
  tags: ['labs'],
};
