//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.duffel',
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
});
