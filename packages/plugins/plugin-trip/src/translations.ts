//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Trip',
        'trip.new.label': 'New trip',
        'segment.add.label': 'Add segment',
        'segment.flight.label': 'Flight',
        'segment.train.label': 'Train',
        'segment.boat.label': 'Boat',
        'segment.road.label': 'Road',
        'segment.lodging.label': 'Lodging',
        'segment.activity.label': 'Activity',
      },
    },
  },
] as const satisfies Resource[];
