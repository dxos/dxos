//
// Copyright 2025 DXOS.org
//

import { Role } from '@dxos/app-framework';

type PlaygroundRole = Role.Role<Record<string, any>>;

/** Shared role tokens for playground/test surfaces. */
export const PlaygroundRoles: {
  Primary: PlaygroundRole;
  Secondary: PlaygroundRole;
  Toolbar: PlaygroundRole;
} = {
  Primary: Role.make<Record<string, any>>('org.dxos.test.role.primary'),
  Secondary: Role.make<Record<string, any>>('org.dxos.test.role.secondary'),
  Toolbar: Role.make<Record<string, any>>('org.dxos.test.role.toolbar'),
};
