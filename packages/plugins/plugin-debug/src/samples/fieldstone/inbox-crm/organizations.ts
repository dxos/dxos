//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import { Organization } from '@dxos/types';

import { LOGO_IMAGES } from '../logo-images.ts';
import { makeLogo } from '../logo.ts';
import { type Make } from '../util.ts';
import { ORG_SEEDS } from './organization-seeds.ts';

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
        // A customer's own logo where one exists; the generated mark otherwise (vendors, the venue).
        image: LOGO_IMAGES[seed.name] ?? makeLogo(seed.name, seed.logo.color, seed.logo.mark),
        ...('location' in seed ? { location: [...seed.location] } : {}),
      }),
    ),
  );
