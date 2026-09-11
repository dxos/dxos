//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

//
// The company and the people who show up in tasks, reviews and decisions.
//

export type OrgKey = 'tidepool' | 'northwind';

export type OrgMap = Record<OrgKey, Organization.Organization>;

const ORG_SEEDS = [
  {
    key: 'tidepool',
    name: 'Tidepool',
    description: 'Six-person team building an offline-first notes app for field research.',
    status: 'active',
    website: 'https://tidepool.dev',
  },
  {
    key: 'northwind',
    name: 'Northwind Marine Lab',
    description: 'Design partner. Their field teams work for weeks with no connectivity.',
    status: 'active',
    website: 'https://northwind-marine.org',
  },
] as const;

export const Team: SampleSpace.Phase<OrgMap> = SampleSpace.phase('team', {
  schemas: [Organization.Organization],
  run: () =>
    SampleSpace.seed(ORG_SEEDS, (seed) =>
      Database.add(
        Organization.make({
          name: seed.name,
          description: seed.description,
          status: seed.status,
          website: seed.website,
        }),
      ),
    ),
});

export type PersonKey = 'noa' | 'ravi' | 'imogen' | 'theo' | 'lena' | 'sung';

export type PersonMap = Record<PersonKey, Person.Person>;

const PERSON_SEEDS = [
  { key: 'noa', fullName: 'Noa Almeida', jobTitle: 'Engineering lead', orgKey: 'tidepool', email: 'noa@tidepool.dev' },
  { key: 'ravi', fullName: 'Ravi Menon', jobTitle: 'Sync engineer', orgKey: 'tidepool', email: 'ravi@tidepool.dev' },
  {
    key: 'imogen',
    fullName: 'Imogen Clarke',
    jobTitle: 'Mobile engineer',
    orgKey: 'tidepool',
    email: 'imogen@tidepool.dev',
  },
  { key: 'theo', fullName: 'Theo Baptiste', jobTitle: 'Designer', orgKey: 'tidepool', email: 'theo@tidepool.dev' },
  { key: 'lena', fullName: 'Lena Hofer', jobTitle: 'QA', orgKey: 'tidepool', email: 'lena@tidepool.dev' },
  {
    key: 'sung',
    fullName: 'Sung-min Park',
    jobTitle: 'Field research lead',
    orgKey: 'northwind',
    email: 'sungmin@northwind-marine.org',
  },
] as const;

export const People: SampleSpace.Phase<PersonMap, OrgMap> = SampleSpace.phase('people', {
  schemas: [Person.Person],
  run: (organizations: OrgMap) =>
    SampleSpace.seed(PERSON_SEEDS, (seed) =>
      Database.add(
        Person.make({
          fullName: seed.fullName,
          jobTitle: seed.jobTitle,
          organization: Ref.make(organizations[seed.orgKey]),
          emails: [{ label: 'Work', value: seed.email }],
        }),
      ),
    ),
});
