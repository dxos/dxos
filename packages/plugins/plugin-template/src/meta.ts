//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.template'),
  name: 'Template',
  author: 'DXOS',
  description: trim`
    Create reusable templates for documents, tables, and other objects.
    Define structured patterns that can be quickly instantiated with pre-configured content and settings.
  `,
  icon: 'ph--asterisk--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-template',
});
