//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import { Organization } from '@dxos/types';

//
// Organizations
//

export type OrgKey = 'bramble' | 'fincaEsperanza' | 'sidamoCoop' | 'northStar' | 'hatch' | 'oliveAndVine';

export type OrgMap = Record<OrgKey, Organization.Organization>;

const ORG_SEEDS: Array<{
  key: OrgKey;
  name: string;
  description: string;
  status: 'active' | 'qualified' | 'prospect' | 'commit';
  website: string;
  location: [number, number]; // [lng, lat]
}> = [
  {
    key: 'bramble',
    name: 'Bramble Coffee Roasters',
    description: 'Our roastery and cafe in Oakland, CA.',
    status: 'active',
    website: 'https://bramblecoffee.com',
    location: [-122.2711, 37.8044],
  },
  {
    key: 'fincaEsperanza',
    name: 'Finca Esperanza',
    description: 'Family farm in Huila, Colombia. Carmen Restrepo. Washed caturra and pink bourbon.',
    status: 'active',
    website: 'https://fincaesperanza.co',
    location: [-75.5277, 2.5359],
  },
  {
    key: 'sidamoCoop',
    name: 'Sidamo Cooperative',
    description: 'Cooperative in Sidamo, Ethiopia. Naturals. Contact: Abel Tadesse.',
    status: 'active',
    website: 'https://sidamocoop.org',
    location: [38.4955, 6.7665],
  },
  {
    key: 'northStar',
    name: 'North Star Café',
    description: 'Wholesale customer in Portland, OR. Linden + rotating single-origin.',
    status: 'active',
    website: 'https://northstarcafe.com',
    location: [-122.6765, 45.5231],
  },
  {
    key: 'hatch',
    name: 'Hatch Bakery',
    description: 'Wholesale customer in Brooklyn, NY. Linden + Field Notes. Piloting Spring Blend.',
    status: 'qualified',
    website: 'https://hatchbakery.com',
    location: [-73.9442, 40.6782],
  },
  {
    key: 'oliveAndVine',
    name: 'Olive & Vine',
    description: 'New wholesale lead in Austin, TX. Mateo Ruiz. First samples just went out.',
    status: 'prospect',
    website: 'https://oliveandvine.cafe',
    location: [-97.7431, 30.2672],
  },
];

/** Suppliers, wholesale customers and the roastery itself; every later phase references these. */
export const Organizations: SampleSpace.Phase<OrgMap> = SampleSpace.phase('organizations', {
  schemas: [Organization.Organization],
  run: () =>
    SampleSpace.seed(ORG_SEEDS, (seed) =>
      Database.add(
        Organization.make({
          name: seed.name,
          description: seed.description,
          status: seed.status,
          website: seed.website,
          location: seed.location,
        }),
      ),
    ),
});
