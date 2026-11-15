//
// Copyright 2026 DXOS.org
//

import { AVATAR_IMAGES } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/avatar-images.ts';
import { CONTACT_SEEDS } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/contact-seeds.ts';
import { PEOPLE_SEEDS } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/team/seeds.ts';
import { type PersonData } from '../../../packages/ui/react-ui-masonry/src/Masonry.stories.tsx';

/**
 * The people of the Alien Labs space template, as the gallery's cards: the team, then the CRM's contacts. One with no
 * headshot is left out, since a gallery of faces with a gap reads as broken.
 */
export const alienLabsPeople = (): PersonData[] =>
  [
    ...PEOPLE_SEEDS.map((seed) => ({
      id: `team-${seed.key}`,
      fullName: seed.fullName,
      jobTitle: seed.jobTitle,
      department: 'department' in seed ? seed.department : 'Engineering',
      email: `${seed.key}@alienlabs.io`,
    })),
    ...CONTACT_SEEDS.map((seed) => ({
      id: `contact-${seed.key}`,
      fullName: seed.fullName,
      jobTitle: 'jobTitle' in seed ? seed.jobTitle : undefined,
      department: 'department' in seed ? seed.department : undefined,
      email: seed.email,
    })),
  ].flatMap(({ email, ...person }) => {
    const image = AVATAR_IMAGES[person.fullName];
    return image ? [{ ...person, image, emails: [{ value: email }] }] : [];
  });
