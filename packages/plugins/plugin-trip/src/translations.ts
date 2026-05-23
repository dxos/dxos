//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Booking, Trip } from '#types';

export const translations = [
  {
    'en-US': {
      [Trip.Trip.typename]: {
        'typename.label': 'Trip',
        'typename.label_zero': 'Trips',
        'typename.label_one': 'Trip',
        'typename.label_other': 'Trips',
      },
      [Booking.Booking.typename]: {
        'typename.label': 'Booking',
        'typename.label_zero': 'Bookings',
        'typename.label_one': 'Booking',
        'typename.label_other': 'Bookings',
      },
      [meta.id]: {
        'plugin.name': 'Trip',
        'trip.new.label': 'New trip',
        'segment.add.label': 'Add segment',
        'segment.companion.label': 'Segment',
        'segment.flight.label': 'Flight',
        'segment.train.label': 'Train',
        'segment.boat.label': 'Boat',
        'segment.road.label': 'Road',
        'segment.accommodation.label': 'Accommodation',
        'segment.activity.label': 'Activity',
      },
    },
  },
] as const satisfies Resource[];
