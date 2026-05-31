//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Booking, Trip } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Trip.Trip)]: {
        'typename.label': 'Trip',
        'typename.label_zero': 'Trips',
        'typename.label_one': 'Trip',
        'typename.label_other': 'Trips',
      },
      [Type.getTypename(Booking.Booking)]: {
        'typename.label': 'Booking',
        'typename.label_zero': 'Bookings',
        'typename.label_one': 'Booking',
        'typename.label_other': 'Bookings',
      },
      [meta.id]: {
        'plugin.name': 'Trip',
        'settings.title': 'Trip',
        'trip.new.label': 'New trip',
        'trip.merge.label': 'Merge into nearest trip',
        'segment.add.label': 'Add segment',
        'segment.companion.label': 'Segment',
        'segment.flight.label': 'Flight',
        'segment.train.label': 'Train',
        'segment.boat.label': 'Boat',
        'segment.road.label': 'Road',
        'segment.accommodation.label': 'Accommodation',
        'segment.activity.label': 'Activity',
        'segment.delete.label': 'Delete segment',
        'segment.depart.placeholder': 'Pick a departure date',
      },
    },
  },
] as const satisfies Resource[];
