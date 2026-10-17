//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { Person } from '@dxos/types';

import { type Make } from '../util.ts';
import { type OrgKey, type Orgs } from './organizations.ts';

const CONTACT_SEEDS = [
  {
    key: 'dana',
    fullName: 'Dana Whitfield',
    email: 'dana.whitfield@stripe.com',
    org: 'stripe',
    jobTitle: 'Account Executive',
    department: 'Sales',
  },
  {
    key: 'elena',
    fullName: 'Elena Marsh',
    email: 'elena.marsh@cloudflare.com',
    org: 'cloudflare',
    jobTitle: 'Solutions Architect',
    department: 'Sales',
  },
  {
    key: 'sofia',
    fullName: 'Sofia Brandt',
    email: 'sofia.brandt@github.com',
    org: 'github',
    jobTitle: 'Partner Manager',
    department: 'Partnerships',
  },
  {
    key: 'ines',
    fullName: 'Inês Duarte',
    email: 'ines.duarte@cloudflare.com',
    org: 'cloudflare',
    jobTitle: 'Enterprise Account Executive',
    department: 'Sales',
  },
  {
    key: 'grace',
    fullName: 'Grace Liu',
    email: 'grace.liu@northpinerobotics.com',
    org: 'northpine',
    jobTitle: 'VP Engineering',
    department: 'Leadership',
  },
  { key: 'marcus', fullName: 'Marcus Bell', email: 'marcus.bell@northpinerobotics.com', org: 'northpine' },
  { key: 'ruth', fullName: 'Ruth Adeyemi', email: 'ruth.adeyemi@northpinerobotics.com', org: 'northpine' },
  {
    key: 'aisha',
    fullName: 'Aisha Bello',
    email: 'aisha.bello@meridianhealthdata.com',
    org: 'meridian',
    jobTitle: 'Head of Platform',
    department: 'Engineering',
  },
  { key: 'ted', fullName: 'Ted Kowalski', email: 'ted.kowalski@meridianhealthdata.com', org: 'meridian' },
  {
    key: 'kenji',
    fullName: 'Kenji Moreau',
    email: 'kenji.moreau@meridianhealthdata.com',
    org: 'meridian',
    jobTitle: 'Compliance Officer',
    department: 'Security',
  },
  {
    key: 'nadia',
    fullName: 'Nadia Petrov',
    email: 'nadia.petrov@okapipay.com',
    org: 'okapi',
    jobTitle: 'Engineering Director',
    department: 'Engineering',
  },
  { key: 'sam', fullName: 'Sam Reyes', email: 'sam.reyes@okapipay.com', org: 'okapi' },
  {
    key: 'leo',
    fullName: 'Leo Marchetti',
    email: 'leo.marchetti@brightwatergames.com',
    org: 'brightwater',
    jobTitle: 'CTO',
    department: 'Leadership',
  },
  {
    key: 'mila',
    fullName: 'Mila Novak',
    email: 'mila.novak@brightwatergames.com',
    org: 'brightwater',
    jobTitle: 'Engineering Manager',
    department: 'Engineering',
  },
  { key: 'wren', fullName: 'Wren Calloway', email: 'wren.calloway@saltmarshlodge.pt', org: 'saltmarsh' },
] as const satisfies ReadonlyArray<{
  key: string;
  fullName: string;
  email: string;
  org: OrgKey;
  jobTitle?: string;
  department?: string;
}>;

export type ContactKey = (typeof CONTACT_SEEDS)[number]['key'];

export type Contacts = Record<ContactKey, Person.Person>;

/** Contacts with no job title were extracted from their first email, so they hold only what it carried. */
export const EXTRACTED: ReadonlyArray<ContactKey> = CONTACT_SEEDS.filter((seed) => !('jobTitle' in seed)).map(
  (seed) => seed.key,
);

/**
 * Hand-entered contacts carry a labelled email, a job title and a department. Extracted ones carry
 * what `buildContactFromActor` writes: the sender's name, a bare normalized email, and the
 * organization its domain matched.
 */
export const makeContacts = (orgs: Orgs): Make<Contacts> =>
  SampleSpace.seed(CONTACT_SEEDS, (seed) =>
    Database.add(
      'jobTitle' in seed
        ? Person.make({
            fullName: seed.fullName,
            jobTitle: seed.jobTitle,
            department: seed.department,
            emails: [{ label: 'Work', value: seed.email }],
            organization: Ref.make(orgs[seed.org]),
          })
        : Person.make({
            fullName: seed.fullName,
            emails: [{ value: seed.email }],
            organization: Ref.make(orgs[seed.org]),
          }),
    ),
  );
