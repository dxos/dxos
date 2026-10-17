//
// Copyright 2026 DXOS.org
//

import { Database } from '@dxos/echo';
import { Organization } from '@dxos/types';

import { type Make } from '../util.ts';

export const makeFieldstone = (): Make<Organization.Organization> =>
  Database.add(
    Organization.make({
      name: 'Alien Labs',
      status: 'active',
      website: 'https://alienlabs.dev',
      description:
        'Builds Cairn, a hosted build cache for monorepos, on DXOS: the dashboard is a Composer plugin and the agents run on EDGE. Remote team, Lisbon and Toronto.',
    }),
  );
