//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { type Organization, Person } from '@dxos/types';

import { AVATAR_IMAGES } from '../avatar-images.ts';
import { type Make } from '../util.ts';
import { PEOPLE_SEEDS } from './seeds.ts';

export type PersonKey = (typeof PEOPLE_SEEDS)[number]['key'];

export type People = Record<PersonKey, Person.Person>;

/** Hana joined two weeks before the reference date; partials that schedule her work start there. */
export const HANA_JOINED_DAYS_AGO = 14;

export const makePeople = (fieldstone: Organization.Organization): Make<People> =>
  SampleSpace.seed(PEOPLE_SEEDS, (seed) =>
    Database.add(
      Person.make({
        fullName: seed.fullName,
        ...(AVATAR_IMAGES[seed.fullName] && { image: AVATAR_IMAGES[seed.fullName] }),
        jobTitle: seed.jobTitle,
        department: 'department' in seed ? seed.department : 'Engineering',
        location: seed.location,
        emails: [{ label: 'Work', value: `${seed.key}@alienlabs.io` }],
        organization: Ref.make(fieldstone),
      }),
    ),
  );
