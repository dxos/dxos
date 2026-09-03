//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

//
// Accounts and the people at them. `status` is the pipeline stage: every column of the board is a
// view filtered on it, so the seeds here are what the board is a picture of.
//

export type AccountKey = 'meridian' | 'bellweather' | 'foxglove' | 'northgate' | 'quarry' | 'saltbox' | 'tinderbox';

export type AccountMap = Record<AccountKey, Organization.Organization>;

const ACCOUNT_SEEDS = [
  {
    key: 'meridian',
    name: 'Meridian Health',
    description: 'Renewed for a third year. Two hundred seats, expanding into their research arm.',
    status: 'active',
    website: 'https://meridianhealth.example',
  },
  {
    key: 'bellweather',
    name: 'Bellweather Logistics',
    description: 'Signed in March. Rolling out to dispatch first, then the depots.',
    status: 'active',
    website: 'https://bellweather.example',
  },
  {
    key: 'foxglove',
    name: 'Foxglove Studios',
    description: 'Verbal yes on a 40-seat plan; waiting on their finance sign-off.',
    status: 'commit',
    website: 'https://foxglove.example',
  },
  {
    key: 'northgate',
    name: 'Northgate Credit Union',
    description: 'Security review passed. Procurement is the only thing left.',
    status: 'commit',
    website: 'https://northgatecu.example',
  },
  {
    key: 'quarry',
    name: 'Quarry Analytics',
    description: 'Pilot running with eight users. Champion is the head of data.',
    status: 'qualified',
    website: 'https://quarry.example',
  },
  {
    key: 'saltbox',
    name: 'Saltbox Provisions',
    description: 'Inbound from the newsletter. Budget unclear, timeline unclear.',
    status: 'prospect',
    website: 'https://saltbox.example',
  },
  {
    key: 'tinderbox',
    name: 'Tinderbox Media',
    description: 'Went quiet after the second call. Re-engage next quarter, or close it out.',
    status: 'reject',
    website: 'https://tinderbox.example',
  },
] as const;

/** The accounts, each already at its pipeline stage. */
export const Accounts: SampleSpace.Phase<AccountMap> = SampleSpace.phase('accounts', {
  schemas: [Organization.Organization],
  run: () =>
    SampleSpace.seed(ACCOUNT_SEEDS, (seed) =>
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

export type ContactKey = 'dara' | 'wes' | 'ines' | 'gil' | 'mo' | 'ruth' | 'jonas';

export type ContactMap = Record<ContactKey, Person.Person>;

const CONTACT_SEEDS = [
  {
    key: 'dara',
    fullName: 'Dara Osei',
    jobTitle: 'Director of IT',
    accountKey: 'meridian',
    email: 'dara.osei@meridianhealth.example',
  },
  {
    key: 'wes',
    fullName: 'Wes Kowalski',
    jobTitle: 'Head of Dispatch',
    accountKey: 'bellweather',
    email: 'wes@bellweather.example',
  },
  {
    key: 'ines',
    fullName: 'Inés Baptista',
    jobTitle: 'Studio Producer',
    accountKey: 'foxglove',
    email: 'ines@foxglove.example',
  },
  {
    key: 'gil',
    fullName: 'Gil Ferreira',
    jobTitle: 'CISO',
    accountKey: 'northgate',
    email: 'g.ferreira@northgatecu.example',
  },
  { key: 'mo', fullName: 'Mo Haddad', jobTitle: 'Head of Data', accountKey: 'quarry', email: 'mo@quarry.example' },
  { key: 'ruth', fullName: 'Ruth Lindqvist', jobTitle: 'Owner', accountKey: 'saltbox', email: 'ruth@saltbox.example' },
  {
    key: 'jonas',
    fullName: 'Jonas Vail',
    jobTitle: 'Creative Director',
    accountKey: 'tinderbox',
    email: 'jonas@tinderbox.example',
  },
] as const;

/** One named contact per account — whoever the mail in this space is actually with. */
export const Contacts: SampleSpace.Phase<ContactMap, AccountMap> = SampleSpace.phase('contacts', {
  schemas: [Person.Person],
  run: (accounts: AccountMap) =>
    SampleSpace.seed(CONTACT_SEEDS, (seed) =>
      Database.add(
        Person.make({
          fullName: seed.fullName,
          jobTitle: seed.jobTitle,
          organization: Ref.make(accounts[seed.accountKey]),
          emails: [{ label: 'Work', value: seed.email }],
        }),
      ),
    ),
});

/** Contact seeds, for the phases that need a name and address rather than the object. */
export const contactSeed = (key: ContactKey) => {
  const seed = CONTACT_SEEDS.find((seed) => seed.key === key);
  if (!seed) {
    throw new Error(`No CONTACT_SEEDS entry for "${key}".`);
  }
  return seed;
};
