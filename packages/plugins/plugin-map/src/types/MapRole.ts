//
// Copyright 2025 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import { type Obj } from '@dxos/echo';
import { type ProjectionType } from '@dxos/react-ui-geo';

/** Role token for the inline map surface (subject is any ECHO object with markers). */
export const MapInline: Role.Role<{ subject: Obj.Any; attendableId?: string }> =
  Role.make('org.dxos.plugin.map.role.map');

/** Role token for a plain world map; the requester picks the projection through the data. */
export const World: Role.Role<{ projection?: ProjectionType }> = Role.make('org.dxos.plugin.map.role.world');
