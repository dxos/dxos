//
// Copyright 2025 DXOS.org
//

import '../components/MapSurface';

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Map } from '@dxos/plugin-map';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.createWeb({
        id: 'surface.map',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Map.Map),
          AppSurface.object(AppSurface.Section, Map.Map),
        ),
        tagName: 'dx-map-surface',
        position: 'first',
      }),
    ]),
  ),
);
