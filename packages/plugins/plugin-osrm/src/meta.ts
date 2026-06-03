//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.osrm'),
  name: 'OSRM',
  author: 'DXOS',
  description: trim`
    OSRM contributes a driving-route provider to Composer. It implements the plugin-trip
    RoutingService capability by geocoding city names via Nominatim and computing the driving route
    through them via the public OSRM demo server, returning per-leg distance, drive time, and a map
    polyline. The Trip plugin's PlanRoute operation uses it to turn an ordered list of cities into a
    connected chain of road segments. Both upstream services are free and require no API key; this
    is a prototype provider suitable for development and demos.
  `,
  icon: 'ph--path--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-osrm',
  tags: ['labs'],
});
