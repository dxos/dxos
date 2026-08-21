//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'TripPlugin': 'src/TripPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing.ts',
    'testing/index': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'Booking': 'src/types/Booking.ts',
    'BookingOperation': 'src/types/BookingOperation.ts',
    'BookingSearch': 'src/types/BookingSearch.ts',
    'Place': 'src/types/Place.ts',
    'Routing': 'src/types/Routing.ts',
    'RoutingOperation': 'src/types/RoutingOperation.ts',
    'Segment': 'src/types/Segment.ts',
    'Trip': 'src/types/Trip.ts',
    'TripCapabilities': 'src/types/TripCapabilities.ts',
    'TripEvents': 'src/types/TripEvents.ts',
    'TripOperation': 'src/types/TripOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
