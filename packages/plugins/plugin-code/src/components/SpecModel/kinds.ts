//
// Copyright 2026 DXOS.org
//

import type * as Tag from '@dxos/react-ui/Tag';

/** Hue and icon per block kind, matching the spec editor's keyword colours so a kind reads the same in both. */
export const KIND_STYLE: Record<string, { icon: string; hue: Tag.TagHue }> = {
  type: { icon: 'ph--cube--regular', hue: 'blue' },
  op: { icon: 'ph--lightning--regular', hue: 'orange' },
  feat: { icon: 'ph--star--regular', hue: 'emerald' },
  question: { icon: 'ph--question--regular', hue: 'amber' },
  scenario: { icon: 'ph--path--regular', hue: 'cyan' },
  test: { icon: 'ph--check-square--regular', hue: 'teal' },
  suite: { icon: 'ph--stack--regular', hue: 'lime' },
  component: { icon: 'ph--browser--regular', hue: 'pink' },
  service: { icon: 'ph--plug--regular', hue: 'yellow' },
  capability: { icon: 'ph--puzzle-piece--regular', hue: 'indigo' },
  module: { icon: 'ph--package--regular', hue: 'indigo' },
  db: { icon: 'ph--database--regular', hue: 'red' },
  table: { icon: 'ph--table--regular', hue: 'red' },
  binding: { icon: 'ph--link--regular', hue: 'neutral' },
  actor: { icon: 'ph--cpu--regular', hue: 'yellow' },
  route: { icon: 'ph--signpost--regular', hue: 'orange' },
  keyspace: { icon: 'ph--key--regular', hue: 'red' },
  // External nodes: a code symbol, or another spec whose text is not at hand.
  code: { icon: 'ph--file-code--regular', hue: 'amber' },
  spec: { icon: 'ph--file-text--regular', hue: 'violet' },
};

export const kindStyle = (kind: string): { icon: string; hue: Tag.TagHue } =>
  KIND_STYLE[kind] ?? { icon: 'ph--square--regular', hue: 'neutral' };

/**
 * The independently toggled groups of a definition graph: what the code is made of, what it must do, how it is checked,
 * and any block kind the graph does not know.
 */
export type KindGroup = 'concepts' | 'requirements' | 'qa' | 'other';

export const KIND_GROUPS: readonly KindGroup[] = ['concepts', 'requirements', 'qa', 'other'];

const GROUP_OF: Record<string, KindGroup> = {
  feat: 'requirements',
  req: 'requirements',
  question: 'requirements',
  scenario: 'qa',
  test: 'qa',
  suite: 'qa',
};

/** A kind's group; a styled kind not otherwise grouped is a concept, and an unknown kind goes to `other`. */
export const groupOf = (kind: string): KindGroup => GROUP_OF[kind] ?? (kind in KIND_STYLE ? 'concepts' : 'other');

/** The kinds to leave out of a graph, given which groups are shown. */
export const hiddenKinds = (kinds: Iterable<string>, shown: Record<KindGroup, boolean>): string[] =>
  [...kinds].filter((kind) => !shown[groupOf(kind)]);
