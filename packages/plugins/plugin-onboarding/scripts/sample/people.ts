//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { Actor, Person } from '@dxos/types';

import { type OrgKey, type OrgMap } from './organizations';

//
// People
//

export type PersonKey = 'kai' | 'diego' | 'sam' | 'riley' | 'carmen' | 'abel' | 'jordan' | 'priya' | 'mateo';

export type PersonMap = Record<PersonKey, Person.Person>;

// The sample space's main character — the mailbox's primary user. Mail this person authored is
// tagged `sent`; everything else is received into the shared team inbox. Kai (co-founder / head
// roaster) anchors the Spring Blend narrative, so her outbox reads as the natural protagonist's.
export const MAIN_CHARACTER: PersonKey = 'kai';

export type PersonSeed = {
  key: PersonKey;
  fullName: string;
  preferredName: string;
  jobTitle: string;
  orgKey: OrgKey;
  email: string;
};

export const PEOPLE_SEEDS: Array<{
  key: PersonKey;
  fullName: string;
  preferredName: string;
  jobTitle: string;
  orgKey: OrgKey;
  email: string;
}> = [
  {
    key: 'kai',
    fullName: 'Kai Chen',
    preferredName: 'Kai',
    jobTitle: 'Head Roaster (co-founder)',
    orgKey: 'bramble',
    email: 'kai@bramblecoffee.com',
  },
  {
    key: 'diego',
    fullName: 'Diego Alvarez',
    preferredName: 'Diego',
    jobTitle: 'Sourcing (co-founder)',
    orgKey: 'bramble',
    email: 'diego@bramblecoffee.com',
  },
  {
    key: 'sam',
    fullName: 'Sam Okafor',
    preferredName: 'Sam',
    jobTitle: 'Wholesale Lead',
    orgKey: 'bramble',
    email: 'sam@bramblecoffee.com',
  },
  {
    key: 'riley',
    fullName: 'Riley Tanaka',
    preferredName: 'Riley',
    jobTitle: 'Operations & Logistics',
    orgKey: 'bramble',
    email: 'riley@bramblecoffee.com',
  },
  {
    key: 'carmen',
    fullName: 'Carmen Restrepo',
    preferredName: 'Carmen',
    jobTitle: 'Producer',
    orgKey: 'fincaEsperanza',
    email: 'carmen@fincaesperanza.co',
  },
  {
    key: 'abel',
    fullName: 'Abel Tadesse',
    preferredName: 'Abel',
    jobTitle: 'Export Liaison',
    orgKey: 'sidamoCoop',
    email: 'abel@sidamocoop.org',
  },
  {
    key: 'jordan',
    fullName: 'Jordan Park',
    preferredName: 'Jordan',
    jobTitle: 'Owner / Buyer',
    orgKey: 'northStar',
    email: 'jordan@northstarcafe.com',
  },
  {
    key: 'priya',
    fullName: 'Priya Shah',
    preferredName: 'Priya',
    jobTitle: 'Coffee Program Lead',
    orgKey: 'hatch',
    email: 'priya@hatchbakery.com',
  },
  {
    key: 'mateo',
    fullName: 'Mateo Ruiz',
    preferredName: 'Mateo',
    jobTitle: 'Beverage Buyer',
    orgKey: 'oliveAndVine',
    email: 'mateo@oliveandvine.cafe',
  },
];

/** The roastery team plus the supplier and customer contacts the mail and calendar reference. */
export const People: SampleSpace.Phase<PersonMap, OrgMap> = SampleSpace.phase('people', {
  schemas: [Person.Person],
  run: (organizations: OrgMap) =>
    SampleSpace.seed(PEOPLE_SEEDS, (seed) =>
      Database.add(
        Person.make({
          fullName: seed.fullName,
          preferredName: seed.preferredName,
          jobTitle: seed.jobTitle,
          organization: Ref.make(organizations[seed.orgKey]),
          emails: [{ label: 'Work', value: seed.email }],
        }),
      ),
    ),
});

const SEED_BY_KEY = Object.fromEntries(PEOPLE_SEEDS.map((seed) => [seed.key, seed])) as Record<PersonKey, PersonSeed>;

/** Seed row for a person key. Throws rather than returning undefined — a typo is a build error. */
export const personSeed = (key: PersonKey): PersonSeed => {
  const seed = SEED_BY_KEY[key];
  if (!seed) {
    throw new Error(`No PEOPLE_SEEDS entry for PersonKey "${key}".`);
  }
  return seed;
};

/** Mail/calendar actor for a person key, so the two agree on names and addresses. */
export const personActor = (key: PersonKey): Actor.Actor => {
  const { fullName, email } = personSeed(key);
  return { role: 'user', name: fullName, email };
};
