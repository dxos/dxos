//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Map } from '@dxos/plugin-map/types';

import { meta } from '../../meta';

import '../../components/MapSurface';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createWebSurface({
        id: `${meta.id}/surface/map`,
        role: ['article', 'section'],
        tagName: 'dx-map-surface',
        position: 'hoist',
        filter: (data): data is { subject: Map.Map } => Obj.instanceOf(Map.Map, data.subject),
      }),
    ]),
  ),
);
