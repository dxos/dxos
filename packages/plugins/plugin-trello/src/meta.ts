//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.trello',
  name: 'Trello',
  description: trim`
    Bidirectional sync of Trello boards, lists, and cards into ECHO.
    Enables data mashups with other plugins using Trello as a data source.
  `,
  icon: 'ph--columns--regular',
  iconHue: 'blue',
};
