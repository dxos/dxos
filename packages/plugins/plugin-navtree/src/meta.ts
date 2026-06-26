//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);

// TODO(wittjosiah): Factor out.
export const KEY_BINDING = 'KeyBinding';
// TODO(wittjosiah): Factor out.
export const COMMANDS_DIALOG = DXN.make(`${meta.profile.key}.commandsDialog`);
