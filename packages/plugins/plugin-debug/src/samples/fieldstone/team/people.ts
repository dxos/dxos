//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { type Organization, Person } from '@dxos/types';

import { AVATAR_IMAGES } from '../avatar-images.ts';
import { type Make } from '../util.ts';

const LISBON: [number, number] = [-9.14, 38.72];
const TORONTO: [number, number] = [-79.38, 43.65];

export const PEOPLE_SEEDS = [
  { key: 'astrid', fullName: 'Astrid Holm', jobTitle: 'Engineering Manager', location: LISBON },
  { key: 'omar', fullName: 'Omar Haddad', jobTitle: 'Staff Engineer, cache engine', location: TORONTO },
  { key: 'felix', fullName: 'Felix Andersen', jobTitle: 'Backend Engineer, cache engine', location: LISBON },
  { key: 'june', fullName: 'June Okonkwo', jobTitle: 'Senior Engineer, API and billing', location: TORONTO },
  { key: 'tomas', fullName: 'Tomás Vidal', jobTitle: 'Frontend Engineer', location: LISBON },
  { key: 'anika', fullName: 'Anika Rao', jobTitle: 'Site Reliability Engineer', location: TORONTO },
  { key: 'ben', fullName: 'Ben Achterberg', jobTitle: 'Product Designer', department: 'Design', location: LISBON },
  { key: 'lucia', fullName: 'Lucía Ferreira', jobTitle: 'Product Manager', department: 'Product', location: LISBON },
  {
    key: 'kofi',
    fullName: 'Kofi Mensah',
    jobTitle: 'Developer Advocate',
    department: 'Developer Relations',
    location: TORONTO,
  },
  { key: 'hana', fullName: 'Hana Sato', jobTitle: 'Software Engineer', location: TORONTO },
] as const;

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
        emails: [{ label: 'Work', value: `${seed.key}@alienlabs.dev` }],
        organization: Ref.make(fieldstone),
      }),
    ),
  );
