//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/template',
  name: 'Template',
  description: trim`
    Create reusable templates for documents, tables, and other objects.
    Define structured patterns that can be quickly instantiated with pre-configured content and settings.
  `,
  icon: 'ph--asterisk--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-template',
};
