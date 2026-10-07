//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.typesafe',
    name: 'TypeSafe',
    author: 'DXOS',
    description: trim`
      TypeSafe registers a Connector for typesafe.ai so the user can paste their System One API key,
      and contributes the model resolver that serves TypeSafe decision models through AiService in
      every space. The model answers typed questions about a state (probability / classify / rate)
      rather than generating text, so a plugin can classify with decisions instead of a prompt.
      Headless: no UI surfaces.
    `,
    icon: { key: 'ph--scales--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-typesafe',
    tags: ['labs', 'connector'],
  },
});
