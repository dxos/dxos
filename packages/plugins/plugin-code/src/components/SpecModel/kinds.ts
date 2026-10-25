//
// Copyright 2026 DXOS.org
//

import type * as Tag from '@dxos/react-ui/Tag';

/** Hue and icon per block kind, matching the spec editor's keyword colours so a kind reads the same in both. */
export const KIND_STYLE: Record<string, { icon: string; hue: Tag.TagHue }> = {
  type: { icon: 'ph--cube--regular', hue: 'blue' },
  op: { icon: 'ph--lightning--regular', hue: 'orange' },
  feat: { icon: 'ph--star--regular', hue: 'emerald' },
  scenario: { icon: 'ph--path--regular', hue: 'cyan' },
  test: { icon: 'ph--check-square--regular', hue: 'teal' },
  suite: { icon: 'ph--stack--regular', hue: 'lime' },
  component: { icon: 'ph--browser--regular', hue: 'pink' },
  service: { icon: 'ph--plug--regular', hue: 'yellow' },
  capability: { icon: 'ph--puzzle-piece--regular', hue: 'indigo' },
  module: { icon: 'ph--package--regular', hue: 'indigo' },
  db: { icon: 'ph--database--regular', hue: 'red' },
  table: { icon: 'ph--table--regular', hue: 'red' },
  // External nodes: a code symbol, or another spec whose text is not at hand.
  code: { icon: 'ph--file-code--regular', hue: 'amber' },
  spec: { icon: 'ph--file-text--regular', hue: 'violet' },
};

export const kindStyle = (kind: string): { icon: string; hue: Tag.TagHue } =>
  KIND_STYLE[kind] ?? { icon: 'ph--square--regular', hue: 'neutral' };

/** The independently toggled groups of a definition graph: what the code is made of, what it must do, and how it is checked. */
export type KindGroup = 'concepts' | 'requirements' | 'qa';

export const KIND_GROUPS: readonly KindGroup[] = ['concepts', 'requirements', 'qa'];

const GROUP_OF: Record<string, KindGroup> = {
  feat: 'requirements',
  req: 'requirements',
  scenario: 'qa',
  test: 'qa',
  suite: 'qa',
};

/** A kind's group; anything not a requirement or a check is a concept, so a new block kind shows with the code. */
export const groupOf = (kind: string): KindGroup => GROUP_OF[kind] ?? 'concepts';

/** The kinds to leave out of a graph, given which groups are shown. */
export const hiddenKinds = (kinds: Iterable<string>, shown: Record<KindGroup, boolean>): string[] =>
  [...kinds].filter((kind) => !shown[groupOf(kind)]);
