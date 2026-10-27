//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { NavTreeNamespace } from './namespace.ts';

// TODO(wittjosiah): Factor out.
export const KEY_BINDING = 'KeyBinding';
// TODO(wittjosiah): Factor out.
export const COMMANDS_DIALOG = DXN.make(`${NavTreeNamespace.key}.commandsDialog`);
