//
// Copyright 2025 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import { type Obj } from '@dxos/echo';
import { type GeoMarker, type WorldMapView } from '@dxos/react-ui-geo';

/** Role token for the inline map surface (subject is any ECHO object with markers). */
export const MapInline: Role.Role<{ subject: Obj.Any; attendableId?: string }> =
  Role.make('org.dxos.plugin.map.role.map');

/**
 * Role token for a world map of the requester's markers, flat (`map`) or as a globe the reader can toggle to.
 * The marker whose id is selected in `subject` (its URI is the selection context) is highlighted.
 */
export const World: Role.Role<{ markers?: GeoMarker[]; subject?: Obj.Any; view?: WorldMapView }> = Role.make(
  'org.dxos.plugin.map.role.world',
);
