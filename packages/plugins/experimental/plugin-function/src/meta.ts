//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const FUNCTION_PLUGIN = 'dxos.org/plugin/function';

export default {
  id: FUNCTION_PLUGIN,
  name: 'Rules',
  description: 'Rules for distributed functions.',
  tags: ['experimental'],
  icon: 'ph--function--regular',
} satisfies PluginMeta;
