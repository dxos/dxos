//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.trip',
  name: 'Trip',
  author: 'DXOS',
  description: trim`
    Travel itinerary plugin for DXOS Composer. Organise trips as ordered
    sequences of typed segments (flights, trains, boats, hotels, activities)
    each linked to a booking record.
  `,
  icon: 'ph--airplane-takeoff--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-trip',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['travel'],
};
