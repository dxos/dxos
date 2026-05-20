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
  screenshots: [
    'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/2797d56edc9658d018ad75fe48a47f27/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2F2797d56edc9658d018ad75fe48a47f27%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
  ],
};
