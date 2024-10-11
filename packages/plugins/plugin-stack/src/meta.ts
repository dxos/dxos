//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const STACK_PLUGIN = 'dxos.org/plugin/stack';
export const SECTION_IDENTIFIER = 'dxos.org/type/StackSection';

export default {
  id: STACK_PLUGIN,
  // TODO(wittjosiah): Prevents "stacks" language from being exposed to users in settings panel.
  name: 'Collections',
  icon: 'ph--stack-simple--regular',
} satisfies PluginMeta;
