//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createWebSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Map } from '@dxos/plugin-map/types';

import { meta } from '../meta';

import './custom-elements';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createWebSurface({
      id: `${meta.id}/surface/map`,
      role: ['article', 'section'],
      tagName: 'dx-map',
      position: 'hoist',
      filter: (data): data is { subject: Map.Map } => Obj.instanceOf(Map.Map, data.subject),
    }),
  ]);
