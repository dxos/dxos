//
// Copyright 2025 DXOS.org
//

import '../components/MapSurface/index.ts';

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Map from '@dxos/plugin-map/Map';
import { Position } from '@dxos/util';

export const MapSolidSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.createWeb({
          id: 'surface.map',
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, Map.Map),
            AppSurface.object(AppSurface.Section, Map.Map),
          ),
          tagName: 'dx-map-surface',
          position: Position.first,
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.section'],
  },
);
