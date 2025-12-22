//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createWebSurface, defineCapabilityModule } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Map } from '@dxos/plugin-map/types';

import { meta } from '../meta';

import '../components/MapSurface';

export default defineCapabilityModule(() =>
  contributes(Capabilities.ReactSurface, [
    createWebSurface({
      id: `${meta.id}/surface/map`,
      role: ['article', 'section'],
      tagName: 'dx-map-surface',
      position: 'hoist',
      filter: (data): data is { subject: Map.Map } => Obj.instanceOf(Map.Map, data.subject),
    }),
  ]),
);
