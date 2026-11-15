//
// Copyright 2026 DXOS.org
//

import { type GalleryItem } from '../../../packages/ui/react-ui-masonry/src/Masonry.stories.tsx';

/** The portraits, by file name: `01-adrian-costa.png`, in the order of `NAMES`. */
const PORTRAITS = import.meta.glob<string>('./faces/*.png', { eager: true, query: '?url', import: 'default' });

/** The people the gallery shows, each with the portrait of the same number. */
const NAMES = [
  'Adrian Costa',
  'Naomi Brooks',
  'Kenji Mori',
  'Priya Shah',
  'Daniel Mercer',
  'Evelyn Carter',
  'Mei Lin',
  'Arjun Singh',
  'Clara Bennett',
  'Isaiah Reed',
  'Hana Park',
  'Fiona Walsh',
  'Vikram Rao',
  'Leila Haddad',
  'Oliver Hayes',
  'Yuki Tanaka',
  'Marcus Ellis',
  'Amira Hassan',
  'Thomas Whitaker',
  'Minh Tran',
  'Julia Hart',
  'Zoe Robinson',
  'Rafael Silva',
  'David Chen',
  'Anika Patel',
  'Graham Reid',
  'Samuel Grant',
  'Sora Kim',
  'Nadia Rahman',
  'Gabriel Santos',
  'Mira Desai',
  'Camille Morgan',
] as const;

/** Roles, dealt out in turn so the cards differ without the names implying anything about them. */
const ROLES = ['Designer', 'Engineer', 'Product manager', 'Researcher', 'Operations lead', 'Writer'] as const;

const CITIES = ['Lisbon', 'Nairobi', 'Osaka', 'Toronto', 'Mumbai', 'Berlin', 'Mexico City', 'Seoul'] as const;

const NOTES = [
  'Keeps the team notes and the weekly review.',
  'Runs the Thursday demo and collects the feedback.',
  'Prefers a short call to a long thread.',
  'Owns the onboarding guide and its next revision.',
] as const;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The gallery's cards: one person each, with their portrait and two to four rows, so the cards differ in height. */
export const people = (): GalleryItem[] =>
  NAMES.map((name, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `person-${number}`,
      title: name,
      icon: 'ph--user--regular',
      image: PORTRAITS[`./faces/${number}-${slug(name)}.png`],
      rows: [
        { icon: 'ph--briefcase--regular', text: ROLES[index % ROLES.length] },
        { icon: 'ph--envelope-simple--regular', text: `${slug(name).split('-')[0]}@example.com` },
        { icon: 'ph--map-pin--regular', text: CITIES[index % CITIES.length] },
        { icon: 'ph--note--regular', text: NOTES[index % NOTES.length], lines: 3 },
      ].slice(0, 2 + ((index * 5 + 1) % 3)),
    };
  });
