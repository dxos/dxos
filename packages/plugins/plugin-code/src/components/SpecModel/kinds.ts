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
};

export const kindStyle = (kind: string): { icon: string; hue: Tag.TagHue } =>
  KIND_STYLE[kind] ?? { icon: 'ph--square--regular', hue: 'neutral' };
