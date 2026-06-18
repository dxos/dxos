//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

/** Role token for the keyboard-shortcuts hints overlay. */
export const Hints: Surface.RoleToken<Record<string, unknown>> = Surface.makeType('org.dxos.plugin.support.role.hints');

/** Role token for the full keyboard-shortcuts list. */
export const Keyshortcuts: Surface.RoleToken<Record<string, unknown>> = Surface.makeType(
  'org.dxos.plugin.support.role.keyshortcuts',
);
