//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import { Organization } from '@dxos/types';

import { type Make } from '../util.ts';

const ORG_SEEDS = [
  {
    key: 'github',
    name: 'GitHub',
    status: 'active',
    website: 'https://github.com',
    description: 'Hosts our code and CI. We are applying to the Actions integration partner program.',
  },
  {
    key: 'stripe',
    name: 'Stripe',
    status: 'active',
    website: 'https://stripe.com',
    description: 'Billing and payments. Moving Cairn plans to usage-based billing.',
  },
  {
    key: 'cloudflare',
    name: 'Cloudflare',
    status: 'active',
    website: 'https://cloudflare.com',
    description:
      'Primary cloud: DNS, edge Workers, cache nodes and the control plane. Evaluating R2 as the read tier for cache artifacts.',
  },
  {
    key: 'northpine',
    name: 'Northpine Robotics',
    status: 'active',
    website: 'https://northpinerobotics.com',
    description: 'Our largest customer, 120 seats on Cairn. Renewal due next month.',
    location: [-79.9959, 40.4406],
  },
  {
    key: 'meridian',
    name: 'Meridian Health Data',
    status: 'qualified',
    website: 'https://meridianhealthdata.com',
    description: 'Enterprise trial. Paid plan blocked on their vendor security review.',
    location: [-71.0589, 42.3601],
  },
  {
    key: 'okapi',
    name: 'Okapi Payments',
    status: 'active',
    website: 'https://okapipay.com',
    description: 'Payments platform. Hit a cache-corruption incident five weeks ago; postmortem closed.',
    location: [36.8219, -1.2921],
  },
  {
    key: 'brightwater',
    name: 'Brightwater Games',
    status: 'prospect',
    website: 'https://brightwatergames.com',
    description: 'Game studio on Unreal and Perforce. Inbound lead from a build-systems meetup.',
    location: [-73.5674, 45.5019],
  },
  {
    key: 'halcyon',
    name: 'Halcyon Freight',
    status: 'prospect',
    website: 'https://halcyonfreight.com',
    description:
      'Freight logistics, 30 Android and Kotlin engineers on Gradle. Inbound lead from the Monorepo Notes newsletter.',
    location: [4.4777, 51.9244],
  },
  {
    key: 'kestrel',
    name: 'Kestrel Energy',
    status: 'prospect',
    website: 'https://kestrelenergy.com',
    description: 'Grid-management software on a Bazel monorepo, 140 engineers. Inbound lead after a Cache Line issue.',
    location: [-104.9903, 39.7392],
  },
  {
    key: 'vantage',
    name: 'Vantage Aerospace',
    status: 'qualified',
    website: 'https://vantageaero.com',
    description:
      'Flight software for small satellites, 300 engineers on CMake. Qualified; needs US-only data residency.',
    location: [-118.3965, 33.9192],
  },
  {
    key: 'tidewater',
    name: 'Tidewater Insurance',
    status: 'qualified',
    website: 'https://tidewaterins.com',
    description: 'Insurance carrier, 220 engineers on Java and Bazel. Security review passed; MSA in redlines.',
    location: [-72.6851, 41.7637],
  },
  {
    key: 'lumen',
    name: 'Lumen Biotech',
    status: 'active',
    website: 'https://lumenbio.com',
    description: 'Computational biology, 150 seats on Enterprise. Signed three weeks ago; rollout in progress.',
    location: [0.1218, 52.2053],
  },
  {
    key: 'pallas',
    name: 'Pallas Retail Group',
    status: 'reject',
    website: 'https://pallasretail.com',
    description:
      'Retail group in Madrid. Lost to a self-hosted cache: build output must stay in their own data centre.',
    location: [-3.7038, 40.4168],
  },
  {
    key: 'saltmarsh',
    name: 'Saltmarsh Lodge',
    status: 'active',
    website: 'https://saltmarshlodge.pt',
    description: 'Coastal lodge near Comporta. Hosts the Q4 team offsite.',
    location: [-8.7853, 38.3794],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  name: string;
  status: 'active' | 'qualified' | 'prospect' | 'reject';
  website: string;
  description: string;
  location?: readonly [number, number];
}>;

export type OrgKey = (typeof ORG_SEEDS)[number]['key'];

export type Orgs = Record<OrgKey, Organization.Organization>;

export const makeOrganizations = (): Make<Orgs> =>
  SampleSpace.seed(ORG_SEEDS, (seed) =>
    Database.add(
      Organization.make({
        name: seed.name,
        status: seed.status,
        website: seed.website,
        description: seed.description,
        ...('location' in seed ? { location: [...seed.location] } : {}),
      }),
    ),
  );
