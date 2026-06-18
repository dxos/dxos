//
// Copyright 2025 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Obj } from '@dxos/echo';

/** Role token for the inline map surface (subject is any ECHO object with markers). */
export const MapInline: Surface.RoleToken<{ subject: Obj.Any; attendableId?: string }> =
  Surface.makeType('org.dxos.plugin.map.role.map');
