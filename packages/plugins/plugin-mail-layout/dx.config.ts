//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.mailLayout',
    name: 'Mail Layout',
    author: 'DXOS',
    description: 'Minimal master/detail layout for the Composer /mail entry point.',
    icon: { key: 'ph--tray--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-mail-layout',
  },
});
