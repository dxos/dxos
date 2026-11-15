//
// Copyright 2026 DXOS.org
//

import { Database } from '@dxos/echo';
import { Organization } from '@dxos/types';

import { LOGO_IMAGES } from '../logo-images.ts';
import { makeLogo } from '../logo.ts';
import { type Make } from '../util.ts';
import { FIELDSTONE_SEED } from './organization-seed.ts';

export const makeFieldstone = (): Make<Organization.Organization> =>
  Database.add(
    Organization.make({
      name: FIELDSTONE_SEED.name,
      status: FIELDSTONE_SEED.status,
      website: FIELDSTONE_SEED.website,
      image:
        LOGO_IMAGES[FIELDSTONE_SEED.name] ??
        makeLogo(FIELDSTONE_SEED.name, FIELDSTONE_SEED.logo.color, FIELDSTONE_SEED.logo.mark),
      description: FIELDSTONE_SEED.description,
    }),
  );
