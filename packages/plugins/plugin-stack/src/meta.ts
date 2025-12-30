//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const SECTION_IDENTIFIER = 'dxos.org/type/StackSection';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/stack',
  // TODO(wittjosiah): Prevents "stacks" language from being exposed to users in settings panel.
  //   Conside renaming this to the collection plugin and trying to factor more collections logic from the space plugin.
  name: 'Collections',
  description: trim`
    Organize and view curated collections of workspace objects in customizable layouts.
    Group related items together and manage collections with sections and filtering.
  `,
  icon: 'ph--stack-simple--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stack',
};
