//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';

type PlaygroundRole = Surface.RoleToken<Record<string, any>>;

/** Shared role tokens for playground/test surfaces. */
export const PlaygroundRoles: {
  Primary: PlaygroundRole;
  Secondary: PlaygroundRole;
  Toolbar: PlaygroundRole;
} = {
  Primary: Surface.makeType<Record<string, any>>('org.dxos.test.role.primary'),
  Secondary: Surface.makeType<Record<string, any>>('org.dxos.test.role.secondary'),
  Toolbar: Surface.makeType<Record<string, any>>('org.dxos.test.role.toolbar'),
};
