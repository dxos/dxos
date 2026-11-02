//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as TripCapabilities from '@dxos/plugin-trip/TripCapabilities';
import * as TripEvents from '@dxos/plugin-trip/TripEvents';
import { trim } from '@dxos/util';

import { OsrmNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: OsrmNamespace.key,
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
    icon: { key: 'ph--path--regular', hue: 'green' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-osrm',
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'RoutingService',
      { provides: [TripCapabilities.RoutingService], activatesOn: TripEvents.Start },
      () => import('./src/capabilities/routing-service.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
