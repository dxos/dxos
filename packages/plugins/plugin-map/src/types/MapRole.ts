//
// Copyright 2025 DXOS.org
//

import { Role } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';

/** Role token for the inline map surface (subject is any ECHO object with markers). */
export const MapInline: Role.Role<{ subject: Obj.Any; attendableId?: string }> =
  Role.make('org.dxos.plugin.map.role.map');
