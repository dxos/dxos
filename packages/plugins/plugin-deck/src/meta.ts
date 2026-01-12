//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/deck',
  name: 'Layout',
  description: trim`
    Flexible layout system for arranging workspace views in tabs, splits, and panels.
    Customize your workspace organization with drag-and-drop layout management.
  `,
  icon: 'ph--layout--regular',
};
