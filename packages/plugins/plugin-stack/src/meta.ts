//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SECTION_IDENTIFIER = 'dxos.org/type/StackSection';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/stack',
  // TODO(wittjosiah): Prevents "stacks" language from being exposed to users in settings panel.
  //   Conside renaming this to the collection plugin and trying to factor more collections logic from the space plugin.
  name: 'Collections',
  description: 'View collections of objects within the deck.',
  icon: 'ph--stack-simple--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stack',
};
