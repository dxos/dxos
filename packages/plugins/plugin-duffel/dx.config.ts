//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as TripCapabilities from '@dxos/plugin-trip/TripCapabilities';
import * as TripEvents from '@dxos/plugin-trip/TripEvents';
import { trim } from '@dxos/util';

import { DuffelNamespace } from './src/namespace.ts';
import * as DuffelCapabilities from './src/types/DuffelCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: DuffelNamespace.key,
    name: 'Duffel',
    author: 'DXOS',
    description: trim`
      Duffel contributes a flight-search booking provider to Composer. It
      implements the plugin-trip BookingService capability by mapping a simplified
      flight query onto the Duffel REST API (POST /air/offer_requests) and
      returning offers, which the Trip plugin renders inline on a segment. Requests
      are routed through the DXOS edge CORS proxy and authenticated with an API key
      stored in local plugin settings. This first cut is search-only: selecting an
      offer fills the segment and records a local Booking, but no order is placed.
    `,
    icon: { key: 'ph--airplane-tilt--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-duffel',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.trip'],
  },
  modules: [
    AppCapability.settings(() => import('./src/capabilities/duffel.ts', { with: { type: 'module-url' } }), {
      requires: [Capabilities.AtomRegistry],
      provides: [DuffelCapabilities.Settings, TripCapabilities.BookingService],
      activatesOn: TripEvents.Start,
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
