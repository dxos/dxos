//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.game',
  name: 'Game',
  description: trim`
    Generic game plugin. Provides a base Game type with shared players and a
    referenced variant state. Variant plugins (chess, tic-tac-toe, etc.) contribute
    a GameVariant capability that defines their state schema, create form, and
    surface components.
  `,
  icon: 'ph--sword--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-game',
  tags: ['labs'],
};
