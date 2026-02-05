//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

// TODO(wittjosiah): Deck does not currently support `/` in ids.
// TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
//  Ideally this should be worked into the data model in a generic way.
export const REGISTRY_ID = '!dxos:plugin-registry';
export const REGISTRY_KEY = 'plugin-registry';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/registry',
  name: 'Plugins',
  description: trim`
    Plugin management system for discovering, installing, and configuring workspace extensions.
    Browse available plugins and customize your workspace capabilities.
  `,
};
