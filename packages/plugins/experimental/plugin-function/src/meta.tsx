//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const FUNCTION_PLUGIN = 'dxos.org/plugin/function';

export default pluginMeta({
  id: FUNCTION_PLUGIN,
  name: 'Rules',
  description: 'Rules for distributed functions.',
  tags: ['experimental'],
  icon: 'ph--function--regular',
});
