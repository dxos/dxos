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
        'trip.new.label': 'New trip',
        'trip.merge.label': 'Merge into nearest trip',
        'globe.toggle.label': 'Toggle globe',
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
        'segment.view.form.label': 'Details',
        'segment.view.search.label': 'Search',
        'booking.search.label': 'Search',
        'booking.searching.label': 'Searching…',
        'booking.provider.placeholder': 'Select provider',
        'booking.no-providers.message': 'No booking providers configured.',
        'booking.enable-providers.message': 'Enable a booking plugin from the registry to search.',
        'booking.no-offers.message': 'No offers found.',
        'booking.missing-key.message': 'Set the provider API key in plugin settings to search.',
        'booking.past-date.message': 'Choose a departure date in the future to search.',
        'booking.error.message': 'Search failed. Check the provider configuration and try again.',
        'route.plan.label': 'Plan route',
        'route.planning.label': 'Planning route…',
        'route.error.label': 'Could not plan route.',
        'route.error.message': 'Something went wrong planning this route. Check the stops and try again.',
      },
    },
  },
] as const satisfies Resource[];
