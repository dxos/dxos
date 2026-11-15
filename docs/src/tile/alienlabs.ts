//
// Copyright 2026 DXOS.org
//

import { ORG_SEEDS } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/organization-seeds.ts';
import { LOGO_IMAGES } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/logo-images.ts';
import { makeLogo } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/logo.ts';
import { FIELDSTONE_SEED } from '../../../packages/plugins/plugin-debug/src/samples/fieldstone/team/organization-seed.ts';
import { type GalleryItem } from '../../../packages/ui/react-ui-masonry/src/Masonry.stories.tsx';

/** How a CRM status reads on a card. */
const STATUS = { active: 'Active', qualified: 'Qualified', prospect: 'Prospect', reject: 'Rejected' } as const;

/**
 * The organizations of the Alien Labs space template, as the gallery's cards: the team's own, then the CRM's. Each
 * shows the image the template gives it, its logo where it has one and the generated mark otherwise.
 */
export const alienLabsOrganizations = (): GalleryItem[] =>
  [FIELDSTONE_SEED, ...ORG_SEEDS].map((seed) => ({
    id: seed.key,
    title: seed.name,
    icon: 'ph--buildings--regular',
    image: LOGO_IMAGES[seed.name] ?? makeLogo(seed.name, seed.logo.color, seed.logo.mark),
    rows: [
      { icon: 'ph--link--regular', text: new URL(seed.website).hostname },
      { icon: 'ph--tag--regular', text: STATUS[seed.status] },
      { icon: 'ph--note--regular', text: seed.description, lines: 4 },
    ],
  }));
