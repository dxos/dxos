//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const TEMPLATE_PLUGIN = 'dxos.org/plugin/template';

export default {
  id: TEMPLATE_PLUGIN,
  name: 'Template',
  icon: 'ph--asterisk--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-template',
} satisfies PluginMeta;
