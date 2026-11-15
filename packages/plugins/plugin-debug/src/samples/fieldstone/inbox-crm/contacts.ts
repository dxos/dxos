//
// Copyright 2026 DXOS.org
//

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { Person } from '@dxos/types';

import { AVATAR_IMAGES } from '../avatar-images.ts';
import { type Make } from '../util.ts';
import { CONTACT_SEEDS } from './contact-seeds.ts';
import { type Orgs } from './organizations.ts';

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
            ...(AVATAR_IMAGES[seed.fullName] && { image: AVATAR_IMAGES[seed.fullName] }),
            jobTitle: seed.jobTitle,
            department: seed.department,
            emails: [{ label: 'Work', value: seed.email }],
            organization: Ref.make(orgs[seed.org]),
          })
        : Person.make({
            fullName: seed.fullName,
            ...(AVATAR_IMAGES[seed.fullName] && { image: AVATAR_IMAGES[seed.fullName] }),
            emails: [{ value: seed.email }],
            organization: Ref.make(orgs[seed.org]),
          }),
    ),
  );
